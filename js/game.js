// js/game.js

import { Grid } from './grid.js';
import { Renderer } from './renderer.js';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { getNextLevel } from './levels.js';
import { getDirectionVector } from './arrow.js';
import { easeOutCubic } from './easing.js';

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
        this.applyChapterTheme(chapterData);

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

    applyChapterTheme(chapterData) {
        const root = document.documentElement;
        const theme = chapterData.theme || {};
        const gradientTop = theme.backgroundGradient?.[0] || theme.background || '#f0e4c8';
        const gradientBottom = theme.backgroundGradient?.[1] || theme.background || '#d8c8a0';

        root.style.setProperty('--theme-bg-top', gradientTop);
        root.style.setProperty('--theme-bg-bottom', gradientBottom);
        root.style.setProperty('--theme-ink', theme.arrowIdle || '#3a2e1f');
        root.style.setProperty('--theme-accent', theme.hintColor || '#a07030');
        root.style.setProperty('--theme-accent-soft', theme.removableGlow || 'rgba(100,60,30,0.12)');
        root.style.setProperty('--theme-surface', theme.surface || 'rgba(255,255,255,0.44)');
        root.style.setProperty('--theme-surface-strong', theme.surfaceStrong || 'rgba(255,255,255,0.72)');
        root.style.setProperty('--theme-border', theme.borderColor || 'rgba(100,70,40,0.15)');
        root.style.setProperty('--theme-life', theme.lifeAlive || '#c04030');
        root.style.setProperty('--theme-life-shadow', theme.lifeGlow || 'rgba(180,60,40,0.28)');
        root.style.setProperty('--theme-pattern', theme.patternColor || 'rgba(120,80,40,0.08)');
        document.body.dataset.theme = chapterData.id === 5 ? 'ottoman' : 'default';
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

        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));
        const distance = Math.max(this.grid.width, this.grid.height) + 4;

        // 3-phase animation:
        // Phase 1 (0-80ms):  Anticipation — pull back -0.2 cells
        // Phase 2 (0-200ms): Launch — accelerate forward via easeOutCubic
        // Phase 3 (0-150ms): Trail fade — ghost trail fades while arrow is off screen
        // Total ~430ms
        const ph1 = 80;
        const ph2 = 200;
        const ph3 = 150;
        const totalDuration = ph1 + ph2 + ph3;
        const startTime = performance.now();
        const ghostCells = origCells.map(c => ({ x: c.x, y: c.y }));

        const animate = (time) => {
            const elapsed = time - startTime;

            let shift;
            let ghostAlpha = 0;

            if (elapsed < ph1) {
                // Phase 1: anticipation — pull back opposite direction
                const p = elapsed / ph1;
                shift = -0.2 * Math.sin(p * Math.PI / 2);
            } else if (elapsed < ph1 + ph2) {
                // Phase 2: launch — easeOutCubic acceleration forward
                const p = (elapsed - ph1) / ph2;
                shift = easeOutCubic(p) * distance;
            } else {
                // Phase 3: arrow is off screen, show ghost trail fading
                shift = distance;
                const p = (elapsed - ph1 - ph2) / ph3;
                ghostAlpha = 1 - p;
            }

            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * shift;
                path.cells[i].y = origCells[i].y + dy * shift;
            }

            this.renderer.drawGrid(this.grid);

            if (ghostAlpha > 0) {
                this.renderer.drawGhostTrail(ghostCells, path.direction, ghostAlpha);
            }

            if (elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
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

        // Animate: arrow tries to go in its direction but bounces back
        this.isAnimating = true;
        const origState = path.state;
        path.state = 'removing'; // red color
        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));
        const maxShift = 0.6; // cells to shift before bouncing back
        const duration = 500;
        const startTime = performance.now();

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Phase 1 (0-0.35): slide forward
            // Phase 2 (0.35-0.65): hit wall, slight overshoot
            // Phase 3 (0.65-1.0): bounce back to original
            let shift;
            if (progress < 0.35) {
                // Ease out - fast start, slow near wall
                const p = progress / 0.35;
                shift = maxShift * (1 - Math.pow(1 - p, 2));
            } else if (progress < 0.65) {
                // Vibrate/stuck at wall
                const p = (progress - 0.35) / 0.3;
                const shake = Math.sin(p * Math.PI * 4) * 0.08;
                shift = maxShift + shake;
            } else {
                // Bounce back with elastic
                const p = (progress - 0.65) / 0.35;
                const eased = 1 - Math.pow(1 - p, 3);
                shift = maxShift * (1 - eased);
            }

            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * shift;
                path.cells[i].y = origCells[i].y + dy * shift;
            }

            this.renderer.drawGrid(this.grid);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restore
                for (let i = 0; i < path.cells.length; i++) {
                    path.cells[i].x = origCells[i].x;
                    path.cells[i].y = origCells[i].y;
                }
                path.state = origState;
                this.grid.updateRemovableStates();
                this.renderer.drawGrid(this.grid);
                this.isAnimating = false;

                if (remaining <= 0) {
                    if (this.onNoLives) this.onNoLives();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    handleLevelComplete() {
        storage.completeLevel(this.currentLevel.id, this.currentChapter.id);

        // Celebration particle effect
        this.playCelebration(() => {
            if (this.onLevelComplete) {
                const nextLevel = getNextLevel(this.currentLevel.id);
                this.onLevelComplete(this.currentLevel, nextLevel);
            }
        });
    }

    playCelebration(callback) {
        const rect = this.canvas.getBoundingClientRect();
        const particles = [];
        const colors = ['#d4a843', '#c87030', '#2b6e8a', '#3a8a6e', '#b88a30', '#c0713a', '#8a4a2a', '#e8c870'];

        // Create 60 particles
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: rect.width / 2 + (Math.random() - 0.5) * 60,
                y: rect.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 10 - 3,
                size: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }

        const startTime = performance.now();
        const duration = 1200;
        const ctx = this.renderer.ctx;

        const animate = (time) => {
            const elapsed = time - startTime;
            if (elapsed > duration) {
                if (callback) callback();
                return;
            }

            // Draw current grid state as background
            this.renderer.drawGrid(this.grid);

            // Draw particles on top (no zoom/pan transform)
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // gravity
                p.rotation += p.rotSpeed;
                p.alpha = Math.max(0, 1 - elapsed / duration);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                // Draw diamond shape
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size * 0.6, 0);
                ctx.lineTo(0, p.size);
                ctx.lineTo(-p.size * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
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
