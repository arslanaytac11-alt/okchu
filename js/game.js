// js/game.js

import { Grid } from './grid.js';
import { Renderer } from './renderer.js';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { getNextLevel } from './levels.js';
import { getDirectionVector } from './arrow.js';
// sounds removed

const TIME_CONFIG = {
    // [baseSec, perPathSec] indexed by chapter
    1: [60, 3.0], 2: [60, 3.0],
    3: [45, 2.5], 4: [45, 2.5],
    5: [35, 2.0], 6: [35, 2.0],
    7: [25, 1.5], 8: [25, 1.5],
    9: [20, 1.0], 10: [20, 1.0],
};

const TIME_BONUS_CORRECT = 3;
const TIME_PENALTY_WRONG = 5;
const TIME_BONUS_COMBO = 1;

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
        this.onScoreChanged = null;
        this._renderLoopId = null;
        this._timerInterval = null;

        // Scoring system
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.moves = 0;
        this.wrongMoves = 0;
        this.totalPaths = 0;
        this.usedHint = false;
        this.timeLimit = 0;
        this.timeRemaining = 0;
        this.onTimeUp = null;
        this._lastHeartbeat = 0;

        this.setupInput();
    }

    startLevel(levelData, chapterData) {
        this.currentLevel = levelData;
        this.currentChapter = chapterData;
        this.hintedPath = null;
        this.applyChapterTheme(chapterData);

        this.grid = new Grid(levelData.gridWidth, levelData.gridHeight);
        this.grid.loadFromData(levelData.paths);

        this.renderer.setTheme(chapterData.theme, chapterData.id);
        this.renderer.resize(levelData.gridWidth, levelData.gridHeight);
        this.renderer.drawGrid(this.grid);

        this.hintManager.setLevel(levelData.id);

        document.getElementById('level-name').textContent = levelData.name;
        document.getElementById('level-difficulty').textContent = chapterData.difficulty;

        // Reset scoring
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.moves = 0;
        this.wrongMoves = 0;
        this.usedHint = false;
        this.totalPaths = this.grid.paths.length;

        // Countdown timer
        const chapterId = chapterData.id;
        const [baseSec, perPathSec] = TIME_CONFIG[chapterId] || [60, 3.0];
        this.timeLimit = baseSec + Math.round(this.totalPaths * perPathSec);
        this.timeRemaining = this.timeLimit;
        this._startCountdown();
        this._updateScoreDisplay();

        this.updateHintButton();
        this.startRenderLoop();
    }

    _startCountdown() {
        this._stopTimer();
        this._lastTick = Date.now();
        this._timerInterval = setInterval(() => {
            const now = Date.now();
            const dt = (now - this._lastTick) / 1000;
            this._lastTick = now;
            this.timeRemaining = Math.max(0, this.timeRemaining - dt);
            this._updateTimerDisplay();

            // Vignette urgency
            const ratio = this.timeRemaining / this.timeLimit;
            if (ratio < 0.15) {
                this.renderer.setVignetteAlpha(0.15 * (1 + 0.3 * Math.sin(Date.now() / 300)));
            } else if (ratio < 0.3) {
                this.renderer.setVignetteAlpha(0.05);
            } else {
                this.renderer.setVignetteAlpha(0);
            }

            // Heartbeat sound at critical time
            if (ratio < 0.05 && (!this._lastHeartbeat || Date.now() - this._lastHeartbeat > 600)) {
                this._lastHeartbeat = Date.now();
            }

            if (this.timeRemaining <= 0) {
                this._handleTimeUp();
            }
        }, 100);
    }

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }

    _handleTimeUp() {
        this._stopTimer();
        this.stopRenderLoop();
        this.livesManager.loseLife();
        if (this.onLivesChanged) this.onLivesChanged();
        if (this.onTimeUp) this.onTimeUp();
    }

    _updateTimerDisplay() {
        const el = document.getElementById('game-timer');
        if (!el) return;
        const totalSecs = Math.ceil(this.timeRemaining);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        const ratio = this.timeRemaining / this.timeLimit;
        el.classList.toggle('timer-warning', ratio < 0.3 && ratio >= 0.15);
        el.classList.toggle('timer-critical', ratio < 0.15);
    }

    addTime(seconds) {
        this.timeRemaining = Math.min(this.timeLimit, this.timeRemaining + seconds);
        this._updateTimerDisplay();
    }

    removeTime(seconds) {
        this.timeRemaining = Math.max(0, this.timeRemaining - seconds);
        this._updateTimerDisplay();
    }

    _updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        if (scoreEl) scoreEl.textContent = this.score;
        const comboEl = document.getElementById('game-combo');
        if (comboEl) {
            comboEl.textContent = this.combo > 1 ? `x${this.combo}` : '';
            comboEl.classList.toggle('active', this.combo > 1);
        }
        const movesEl = document.getElementById('game-moves');
        if (movesEl) movesEl.textContent = `${this.moves}/${this.totalPaths}`;
        if (this.onScoreChanged) this.onScoreChanged({ score: this.score, combo: this.combo, moves: this.moves });
    }

    // Calculate points for removing a path
    _calculatePoints(path) {
        const basePoints = 10;
        const lengthBonus = path.cells.length * 5;  // Longer arrows = more points
        const comboMultiplier = Math.min(this.combo, 10); // Cap at x10
        const comboBonus = comboMultiplier * 5;
        return basePoints + lengthBonus + comboBonus;
    }

    calculateStars() {
        const ratio = this.timeRemaining / this.timeLimit;
        if (ratio >= 0.7 && this.wrongMoves === 0 && !this.usedHint) return 3;
        if (ratio >= 0.5 && this.wrongMoves <= 2) return 2;
        return 1;
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
            this.renderer.touchFeedback = { path, startTime: performance.now() };

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

        // Scoring: correct move
        this.combo++;
        this.moves++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        const points = this._calculatePoints(path);
        this.score += points;
        this._updateScoreDisplay();
        this._showFloatingScore(points, path);


        // Time bonus
        this.addTime(TIME_BONUS_CORRECT);
        if (this.combo >= 3) this.addTime(TIME_BONUS_COMBO);


        // Combo-scaled particle burst
        const head = path.getHead();
        const burstCx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const burstCy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;
        const dirVec = getDirectionVector(path.direction);
        const burstAngle = Math.atan2(dirVec.dy, dirVec.dx);

        let burstCount, burstSpeed, shakeIntensity;
        if (this.combo >= 10) {
            burstCount = 64; burstSpeed = 200; shakeIntensity = 5;
        } else if (this.combo >= 9) {
            burstCount = 48; burstSpeed = 180; shakeIntensity = 4;
        } else if (this.combo >= 6) {
            burstCount = 32; burstSpeed = 160; shakeIntensity = 3;
        } else if (this.combo >= 4) {
            burstCount = 24; burstSpeed = 140; shakeIntensity = 2;
        } else if (this.combo >= 2) {
            burstCount = 16; burstSpeed = 120; shakeIntensity = 1;
        } else {
            burstCount = 8; burstSpeed = 80; shakeIntensity = 0;
        }

        const comboColors = ['#ffffff', '#fff4a0', '#ffaa40', '#ff5030', '#ff2020'];
        const colorIdx = Math.min(Math.floor(this.combo / 2), comboColors.length - 1);

        this.renderer.burstParticles.burst(burstCx, burstCy, burstCount, {
            speed: burstSpeed,
            spread: Math.PI * 0.8,
            angle: burstAngle,
            life: 0.5 + this.combo * 0.05,
            size: 2 + this.combo * 0.3,
            colors: [comboColors[colorIdx], '#ffffff', this.renderer.theme.arrowIdle],
            gravity: 80,
            shape: this.combo >= 9 ? 'spark' : 'circle',
        });

        if (shakeIntensity > 0) {
            this._doScreenShake(shakeIntensity, 80 + this.combo * 10);
        }

        if (this.combo >= 10) {
            this._showFloatingText('MUHTESEM!', burstCx, burstCy - 40, '#ffd700', 28);
        }

        // Snake slither animation: the arrow slides out in its direction
        // Head leads, body follows like a snake crawling away
        const cells = path.cells;
        const totalCells = cells.length;
        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = cells.map(c => ({ x: c.x, y: c.y }));
        const startTime = performance.now();

        // Speed: the arrow travels its own length + extra to fully exit
        const travelDistance = totalCells + 3; // cells to travel before gone
        const speed = 0.008; // cells per ms (tuned for smooth slither)
        const totalDuration = travelDistance / speed;
        // Each cell starts moving with a wave delay (tail follows head)
        const waveDelay = 60; // ms between each cell starting to move

        const cellStates = cells.map(() => ({ visible: true, offsetX: 0, offsetY: 0, alpha: 1 }));

        const animate = (time) => {
            const elapsed = time - startTime;

            // Head cell (last in array) leads, tail (first) follows
            for (let i = 0; i < totalCells; i++) {
                // Reverse: head (last cell) has 0 delay, tail has most delay
                const delay = (totalCells - 1 - i) * waveDelay;
                const cellElapsed = Math.max(0, elapsed - delay);
                const travel = cellElapsed * speed; // how many cells this cell has moved

                if (travel > travelDistance) {
                    cellStates[i].visible = false;
                } else {
                    // Smooth acceleration at start
                    const accel = Math.min(1, cellElapsed / 150);
                    const smoothTravel = travel * (0.3 + 0.7 * accel);
                    cellStates[i].offsetX = dx * smoothTravel;
                    cellStates[i].offsetY = dy * smoothTravel;
                    cellStates[i].alpha = Math.max(0, 1 - travel / travelDistance);
                }
            }

            for (let i = 0; i < totalCells; i++) {
                if (cellStates[i].visible) {
                    path.cells[i].x = origCells[i].x + cellStates[i].offsetX;
                    path.cells[i].y = origCells[i].y + cellStates[i].offsetY;
                }
            }

            path._snakeCellStates = cellStates;
            this.renderer.drawGrid(this.grid);

            const allGone = cellStates.every(s => !s.visible);
            if (!allGone && elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                for (let i = 0; i < totalCells; i++) {
                    path.cells[i].x = origCells[i].x;
                    path.cells[i].y = origCells[i].y;
                }
                path._snakeCellStates = null;
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

        // Scoring: wrong move breaks combo + time penalty
        this.combo = 0;
        this.wrongMoves++;
        this.removeTime(TIME_PENALTY_WRONG);
        this._updateScoreDisplay();

        // Crack effect
        const wrongHead = path.getHead();
        this.renderer.showCrackEffect(
            this.renderer.gridOffsetX + (wrongHead.x + 0.5) * this.renderer.cellSize,
            this.renderer.gridOffsetY + (wrongHead.y + 0.5) * this.renderer.cellSize
        );

        // 4-phase wrong move animation:
        // Phase 1 (0-60ms):    Forward lunge 0.4 cells
        // Phase 2 (60-160ms):  Hold at 0.4, flash bright red
        // Phase 3 (160-310ms): Shake — sin oscillation, clear flash
        // Phase 4 (310-510ms): Elastic bounce back with cubic ease
        // Screen shake: 2px intensity, 100ms starting at 60ms
        this.isAnimating = true;
        const origState = path.state;
        path.state = 'removing';
        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));

        const ph1 = 60;
        const ph2 = 100;  // 60-160ms
        const ph3 = 150;  // 160-310ms
        const ph4 = 200;  // 310-510ms
        const totalDuration = ph1 + ph2 + ph3 + ph4;
        const lunge = 0.4;
        const startTime = performance.now();
        const shakeStart = ph1;
        const shakeDuration = 100;

        const animate = (time) => {
            const elapsed = time - startTime;

            let shift;

            if (elapsed < ph1) {
                // Phase 1: forward lunge
                const p = elapsed / ph1;
                shift = lunge * (1 - Math.pow(1 - p, 2));
            } else if (elapsed < ph1 + ph2) {
                // Phase 2: hold at lunge, flash red
                shift = lunge;
                path._flashColor = '#ff2020';
            } else if (elapsed < ph1 + ph2 + ph3) {
                // Phase 3: shake oscillation, clear flash
                path._flashColor = null;
                const p = (elapsed - ph1 - ph2) / ph3;
                shift = lunge + Math.sin(p * Math.PI * 6) * 0.12;
            } else {
                // Phase 4: elastic bounce back using cubic ease
                path._flashColor = null;
                const p = (elapsed - ph1 - ph2 - ph3) / ph4;
                const eased = 1 - Math.pow(1 - Math.min(p, 1), 3);
                shift = lunge * (1 - eased);
            }

            // Screen shake: sin/cos oscillation for 100ms starting at phase 2
            const shakeElapsed = (time - startTime) - shakeStart;
            if (shakeElapsed >= 0 && shakeElapsed < shakeDuration) {
                const sp = shakeElapsed / shakeDuration;
                this.renderer.shakeX = Math.sin(sp * Math.PI * 8) * 2 * (1 - sp);
                this.renderer.shakeY = Math.cos(sp * Math.PI * 8) * 2 * (1 - sp);
            } else {
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
            }

            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * shift;
                path.cells[i].y = origCells[i].y + dy * shift;
            }

            this.renderer.drawGrid(this.grid);

            if (elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                // Restore everything
                for (let i = 0; i < path.cells.length; i++) {
                    path.cells[i].x = origCells[i].x;
                    path.cells[i].y = origCells[i].y;
                }
                path._flashColor = null;
                path.state = origState;
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
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
        this._stopTimer();
        const elapsedTime = Math.round((this.timeLimit - this.timeRemaining) * 1000);
        storage.completeLevel(this.currentLevel.id, this.currentChapter.id);

        // Time bonus: 2 points per second remaining
        const timeBonus = Math.round(this.timeRemaining * 2);
        this.score += timeBonus;

        // Perfect bonus (no wrong moves)
        if (this.wrongMoves === 0) this.score += 200;

        const stars = this.calculateStars();

        // Save score
        storage.saveLevelScore(this.currentLevel.id, {
            score: this.score,
            stars,
            moves: this.moves,
            wrongMoves: this.wrongMoves,
            time: elapsedTime,
            bestCombo: this.maxCombo,
        });

        this._updateScoreDisplay();

        // Celebration particle effect
        this.playCelebration(() => {
            if (this.onLevelComplete) {
                const nextLevel = getNextLevel(this.currentLevel.id);
                this.onLevelComplete(this.currentLevel, nextLevel, {
                    score: this.score,
                    stars,
                    moves: this.moves,
                    wrongMoves: this.wrongMoves,
                    time: elapsedTime,
                    timeRemaining: Math.round(this.timeRemaining),
                    maxCombo: this.maxCombo,
                });
            }
        });
    }

    _showFloatingScore(points, path) {
        const head = path.getHead();
        const cx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const cy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;

        let color, fontSize;
        if (this.combo >= 10) { color = '#ff2020'; fontSize = 28; }
        else if (this.combo >= 6) { color = '#ff8c00'; fontSize = 22; }
        else if (this.combo >= 3) { color = '#ffd700'; fontSize = 18; }
        else { color = '#ffffff'; fontSize = 14; }

        const text = this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`;
        this._showFloatingText(text, cx, cy, color, fontSize);
    }

    _showFloatingText(text, x, y, color, fontSize) {
        const start = performance.now();
        const duration = 1000;
        const draw = () => {
            const elapsed = performance.now() - start;
            if (elapsed > duration) return;
            const progress = elapsed / duration;
            const alpha = 1 - progress;
            const offsetY = -progress * 50;
            const scale = 1 + Math.sin(progress * Math.PI) * 0.2;

            const ctx = this.renderer.ctx;
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const sx = x * this.renderer.scale + this.renderer.panX;
            const sy = (y + offsetY) * this.renderer.scale + this.renderer.panY;
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${Math.round(fontSize * scale)}px Georgia`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(text, sx, sy);
            ctx.restore();

            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    }

    _doScreenShake(intensity, duration) {
        const start = performance.now();
        const shake = () => {
            const elapsed = performance.now() - start;
            if (elapsed > duration) {
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
                return;
            }
            const decay = 1 - elapsed / duration;
            this.renderer.shakeX = Math.sin(elapsed * 0.05) * intensity * decay;
            this.renderer.shakeY = Math.cos(elapsed * 0.05) * intensity * decay;
            requestAnimationFrame(shake);
        };
        shake();
    }

    playCelebration(callback) {

        const rect = this.canvas.getBoundingClientRect();
        const particles = [];
        const colors = this.currentChapter?.theme?.particleColors ||
            ['#d4a843', '#c87030', '#2b6e8a', '#3a8a6e', '#b88a30', '#c0713a', '#8a4a2a', '#e8c870'];
        const shapes = ['circle', 'square', 'triangle', 'diamond'];

        const cx = rect.width / 2;
        const cy = rect.height / 2;

        // Create 80 particles with staggered start delays
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            particles.push({
                x: cx + (Math.random() - 0.5) * 60,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.25,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                delay: Math.random() * 100  // staggered 0-100ms
            });
        }

        const startTime = performance.now();
        const duration = 1500;
        const ctx = this.renderer.ctx;
        const dpr = window.devicePixelRatio || 1;

        const animate = (time) => {
            const elapsed = time - startTime;
            if (elapsed > duration) {
                if (callback) callback();
                return;
            }

            const progress = elapsed / duration;

            // Draw current grid state as background with subtle zoom-out
            this.renderer.drawGrid(this.grid);

            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Shockwave ring expanding from center
            const shockProgress = Math.min(elapsed / 400, 1);
            if (shockProgress < 1) {
                const shockRadius = shockProgress * Math.max(rect.width, rect.height) * 0.6;
                const shockAlpha = (1 - shockProgress) * 0.5;
                ctx.strokeStyle = `rgba(255,220,100,${shockAlpha})`;
                ctx.lineWidth = 3 * (1 - shockProgress) + 1;
                ctx.beginPath();
                ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw particles
            for (const p of particles) {
                const particleElapsed = elapsed - p.delay;
                if (particleElapsed <= 0) continue;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.18;   // gravity
                p.vx *= 0.995;  // air resistance
                p.rotation += p.rotSpeed;
                p.alpha = Math.max(0, 1 - particleElapsed / (duration - p.delay));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;

                ctx.beginPath();
                switch (p.shape) {
                    case 'circle':
                        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
                        break;
                    case 'square':
                        ctx.rect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
                        break;
                    case 'triangle':
                        ctx.moveTo(0, -p.size);
                        ctx.lineTo(p.size * 0.87, p.size * 0.5);
                        ctx.lineTo(-p.size * 0.87, p.size * 0.5);
                        break;
                    case 'diamond':
                    default:
                        ctx.moveTo(0, -p.size);
                        ctx.lineTo(p.size * 0.6, 0);
                        ctx.lineTo(0, p.size);
                        ctx.lineTo(-p.size * 0.6, 0);
                        break;
                }
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
        this.usedHint = true;
        this.hintedPath = hintPath;
        this.renderer.drawGrid(this.grid);
        this.renderer.drawHintHighlight(hintPath);
        this.updateHintButton();
    }

    updateHintButton() {
        const btn = document.getElementById('btn-hint');
        if (btn) btn.style.opacity = this.hintManager.hasFreeHint() ? '1' : '0.4';
    }

    startRenderLoop() {
        this.stopRenderLoop();
        const loop = (time) => {
            this.renderer.tick(time);
            if (!this.isAnimating && this.grid) {
                this.renderer.drawGrid(this.grid);
            }
            this._renderLoopId = requestAnimationFrame(loop);
        };
        this._renderLoopId = requestAnimationFrame(loop);
    }

    stopRenderLoop() {
        if (this._renderLoopId !== null) {
            cancelAnimationFrame(this._renderLoopId);
            this._renderLoopId = null;
        }
    }

    handleResize() {
        if (this.grid && this.currentLevel) {
            this.renderer.resize(this.currentLevel.gridWidth, this.currentLevel.gridHeight);
            this.renderer.drawGrid(this.grid);
        }
    }
}
