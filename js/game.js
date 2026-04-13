// js/game.js

import { Grid } from './grid.js';
import { Renderer } from './renderer.js';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { getNextLevel } from './levels.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.grid = null;
        this.livesManager = new LivesManager();
        this.hintManager = new HintManager();
        this.currentLevel = null;
        this.currentChapter = null;
        this.isAnimating = false;
        this.hintedArrow = null;
        this.onLevelComplete = null;
        this.onNoLives = null;
        this.onLivesChanged = null;

        this.setupInput();
    }

    startLevel(levelData, chapterData) {
        this.currentLevel = levelData;
        this.currentChapter = chapterData;
        this.hintedArrow = null;

        this.grid = new Grid(levelData.gridWidth, levelData.gridHeight);
        this.grid.loadFromData(levelData.arrows);

        this.renderer.setTheme(chapterData.theme);
        this.renderer.resize(levelData.gridWidth, levelData.gridHeight);
        this.renderer.drawGrid(this.grid);

        this.hintManager.setLevel(levelData.id);

        document.getElementById('level-name').textContent = levelData.name;
        document.getElementById('level-difficulty').textContent = chapterData.difficulty;

        this.updateHintButton();
    }

    setupInput() {
        const handleTap = (e) => {
            e.preventDefault();
            if (this.isAnimating || !this.grid) return;

            const touch = e.touches ? e.touches[0] : e;
            const { gridX, gridY } = this.renderer.getCellFromPoint(touch.clientX, touch.clientY);
            const arrow = this.grid.getArrowAt(gridX, gridY);

            if (!arrow) return;

            this.hintedArrow = null;

            if (this.grid.isPathClear(arrow)) {
                this.removeArrowWithAnimation(arrow);
            } else {
                this.handleWrongMove(arrow);
            }
        };

        this.canvas.addEventListener('click', handleTap);
        this.canvas.addEventListener('touchstart', handleTap, { passive: false });
    }

    removeArrowWithAnimation(arrow) {
        this.isAnimating = true;
        this.grid.removeArrow(arrow);

        const duration = 300;
        const startTime = performance.now();
        const { dx, dy } = arrow.getDirectionVector();
        const origX = arrow.x;
        const origY = arrow.y;
        const distance = Math.max(this.grid.width, this.grid.height);

        const animate = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            arrow.animProgress = eased;
            arrow.x = origX + dx * distance * eased;
            arrow.y = origY + dy * distance * eased;

            this.renderer.drawGrid(this.grid);

            if (this.hintedArrow) {
                this.drawHintHighlight(this.hintedArrow);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                arrow.x = origX;
                arrow.y = origY;
                this.grid.finalizeRemoval(arrow);
                this.isAnimating = false;
                this.renderer.drawGrid(this.grid);

                if (this.grid.isCleared()) {
                    this.handleLevelComplete();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    handleWrongMove(arrow) {
        if (!this.livesManager.hasLives()) {
            if (this.onNoLives) this.onNoLives();
            return;
        }

        const remaining = this.livesManager.loseLife();
        if (this.onLivesChanged) this.onLivesChanged(remaining);

        this.isAnimating = true;
        const origState = arrow.state;
        arrow.state = 'removing';
        this.renderer.drawGrid(this.grid);

        setTimeout(() => {
            arrow.state = origState;
            this.grid.updateRemovableStates();
            this.renderer.drawGrid(this.grid);
            this.isAnimating = false;

            if (remaining <= 0) {
                if (this.onNoLives) this.onNoLives();
            }
        }, 400);
    }

    handleLevelComplete() {
        storage.completeLevel(this.currentLevel.id, this.currentChapter.id);
        if (this.onLevelComplete) {
            const nextLevel = getNextLevel(this.currentLevel.id);
            this.onLevelComplete(this.currentLevel, nextLevel);
        }
    }

    useHint() {
        if (!this.grid) return;

        const hasFree = this.hintManager.hasFreeHint();
        if (!hasFree) return;

        const hintArrow = this.hintManager.findHintArrow(this.grid);
        if (!hintArrow) return;

        this.hintManager.useFreeHint();
        this.hintedArrow = hintArrow;
        this.renderer.drawGrid(this.grid);
        this.drawHintHighlight(hintArrow);
        this.updateHintButton();
    }

    drawHintHighlight(arrow) {
        const ctx = this.renderer.ctx;
        const cx = this.renderer.gridOffsetX + arrow.x * this.renderer.cellSize + this.renderer.cellSize / 2;
        const cy = this.renderer.gridOffsetY + arrow.y * this.renderer.cellSize + this.renderer.cellSize / 2;
        const radius = this.renderer.cellSize * 0.45;

        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    updateHintButton() {
        const btn = document.getElementById('btn-hint');
        if (this.hintManager.hasFreeHint()) {
            btn.textContent = '?';
            btn.style.opacity = '1';
        } else {
            btn.textContent = '?';
            btn.style.opacity = '0.4';
        }
    }

    handleResize() {
        if (this.grid && this.currentLevel) {
            this.renderer.resize(this.currentLevel.gridWidth, this.currentLevel.gridHeight);
            this.renderer.drawGrid(this.grid);
        }
    }
}
