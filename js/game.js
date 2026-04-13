// js/game.js

import { Grid } from './grid.js';
import { Renderer } from './renderer.js';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { getNextLevel } from './levels.js';
import { getDirectionVector } from './arrow.js';

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
        this.hintedPath = null;
        this.onLevelComplete = null;
        this.onNoLives = null;
        this.onLivesChanged = null;

        this.setupInput();
    }

    startLevel(levelData, chapterData) {
        this.currentLevel = levelData;
        this.currentChapter = chapterData;
        this.hintedPath = null;

        this.grid = new Grid(levelData.gridWidth, levelData.gridHeight);
        this.grid.loadFromData(levelData.paths);

        this.renderer.setTheme(chapterData.theme);
        this.renderer.resize(levelData.gridWidth, levelData.gridHeight);
        this.renderer.drawGrid(this.grid);

        this.hintManager.setLevel(levelData.id);

        document.getElementById('level-name').textContent = levelData.name;
        document.getElementById('level-difficulty').textContent = chapterData.difficulty;

        this.updateHintButton();
    }

    setupInput() {
        // Tap/click to select arrow
        const handleTap = (e) => {
            e.preventDefault();
            if (this.isAnimating || !this.grid) return;

            const touch = e.touches ? e.touches[0] : e;
            const { gridX, gridY } = this.renderer.getCellFromPoint(touch.clientX, touch.clientY);
            const path = this.grid.getPathAt(gridX, gridY);

            if (!path) return;

            this.hintedPath = null;

            if (this.grid.isPathClear(path)) {
                this.removePathWithAnimation(path);
            } else {
                this.handleWrongMove(path);
            }
        };

        this.canvas.addEventListener('click', handleTap);
        this.canvas.addEventListener('touchstart', handleTap, { passive: false });

        // Pinch to zoom
        let lastPinchDist = 0;
        let lastPanX = 0;
        let lastPanY = 0;
        let isPinching = false;

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isPinching = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist = Math.sqrt(dx * dx + dy * dy);
                lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                e.preventDefault();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && isPinching) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                // Zoom
                const scaleChange = dist / lastPinchDist;
                this.renderer.setZoom(this.renderer.scale * scaleChange, centerX, centerY);

                // Pan
                this.renderer.setPan(centerX - lastPanX, centerY - lastPanY);

                lastPinchDist = dist;
                lastPanX = centerX;
                lastPanY = centerY;

                this.renderer.drawGrid(this.grid);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            isPinching = false;
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.grid) return;
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.renderer.setZoom(this.renderer.scale * zoomFactor, centerX, centerY);
            this.renderer.drawGrid(this.grid);
        }, { passive: false });
    }

    removePathWithAnimation(path) {
        this.isAnimating = true;
        this.grid.removePath(path);

        const duration = 400;
        const startTime = performance.now();
        const { dx, dy } = getDirectionVector(path.direction);

        // Store original cell positions
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));
        const distance = Math.max(this.grid.width, this.grid.height) + 2;

        const animate = (time) => {
            const progress = Math.min((time - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            // Move all cells in the path
            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * distance * eased;
                path.cells[i].y = origCells[i].y + dy * distance * eased;
            }

            this.renderer.drawGrid(this.grid);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restore original positions and mark as removed
                for (let i = 0; i < path.cells.length; i++) {
                    path.cells[i].x = origCells[i].x;
                    path.cells[i].y = origCells[i].y;
                }
                this.grid.finalizeRemoval(path);
                this.isAnimating = false;
                this.renderer.drawGrid(this.grid);

                if (this.grid.isCleared()) {
                    this.handleLevelComplete();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    handleWrongMove(path) {
        if (!this.livesManager.hasLives()) {
            if (this.onNoLives) this.onNoLives();
            return;
        }

        const remaining = this.livesManager.loseLife();
        if (this.onLivesChanged) this.onLivesChanged(remaining);

        // Flash the path red
        this.isAnimating = true;
        const origState = path.state;
        path.state = 'removing';
        this.renderer.drawGrid(this.grid);

        setTimeout(() => {
            path.state = origState;
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

        if (!this.hintManager.hasFreeHint()) return;

        const hintPath = this.hintManager.findHintArrow(this.grid);
        if (!hintPath) return;

        this.hintManager.useFreeHint();
        this.hintedPath = hintPath;
        this.renderer.drawGrid(this.grid);
        this.renderer.drawHintHighlight(hintPath);
        this.updateHintButton();
    }

    updateHintButton() {
        const btn = document.getElementById('btn-hint');
        btn.style.opacity = this.hintManager.hasFreeHint() ? '1' : '0.4';
    }

    handleResize() {
        if (this.grid && this.currentLevel) {
            this.renderer.resize(this.currentLevel.gridWidth, this.currentLevel.gridHeight);
            this.renderer.drawGrid(this.grid);
        }
    }
}
