// js/game.js

import { Grid } from './grid.js';
import { Renderer } from './renderer.js?v=2';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { getNextLevel } from './levels.js';
import { getDirectionVector } from './arrow.js';
import { tapLight, tapMedium, tapHeavy, notifyError } from './haptics.js';

const TIME_CONFIG = {
    // [baseSec, perPathSec] indexed by chapter
    1: [60, 3.0], 2: [60, 3.0],
    3: [45, 2.5], 4: [45, 2.5],
    5: [35, 2.0], 6: [35, 2.0],
    7: [25, 1.5], 8: [25, 1.5],
    9: [20, 1.0], 10: [20, 1.0],
};

// Combo reward tiers — threshold must be descending, first match wins.
const COMBO_TIERS = [
    { min: 10, burstCount: 64, burstSpeed: 200, shake: 5, shape: 'spark' },
    { min: 9,  burstCount: 48, burstSpeed: 180, shake: 4, shape: 'spark' },
    { min: 6,  burstCount: 32, burstSpeed: 160, shake: 3, shape: 'circle' },
    { min: 4,  burstCount: 24, burstSpeed: 140, shake: 2, shape: 'circle' },
    { min: 2,  burstCount: 16, burstSpeed: 120, shake: 1, shape: 'circle' },
    { min: 0,  burstCount: 8,  burstSpeed: 80,  shake: 0, shape: 'circle' },
];
const COMBO_COLORS = ['#ffffff', '#fff4a0', '#ffaa40', '#ff5030', '#ff2020'];
const MEGA_COMBO_THRESHOLD = 10;

// Fixed time - no bonus/penalty, solve before time runs out

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
        // Onboarding pointer state — set by main.js before startLevel() when
        // we want to guide the brand-new player through their first taps.
        // Cleared (null) once they've removed enough arrows that they
        // clearly understand the mechanic, or once they leave Egypt-1.
        this.onboardingActive = false;
        this.onboardingTapsLeft = 0;
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

        // Move limit (daily 'moves' modifier). 0 = no limit.
        this.moveLimit = 0;
        this.onMovesUp = null;

        // Daily modifier — passed via startLevel opts.
        // Shape: { type: 'time', multiplier: 0.6 } | { type: 'moves', extraMoves: 2 }
        this.dailyModifier = null;

        // Auto-hint: show a hint automatically after 2 consecutive wrong moves
        this._consecutiveWrongs = 0;
        // Undo history: last N successful moves, capped at UNDO_MAX
        this._moveHistory = [];
        this.undoCharges = 3;

        // Zen mode: no timer, no wrong-move penalties — casual solve
        this.zenMode = false;

        this.setupInput();
    }

    startLevel(levelData, chapterData, opts = {}) {
        this.currentLevel = levelData;
        this.currentChapter = chapterData;
        this.hintedPath = null;
        this.dailyModifier = opts.dailyModifier || null;
        this.applyChapterTheme(chapterData);

        this.grid = new Grid(levelData.gridWidth, levelData.gridHeight);
        this.grid.loadFromData(levelData.paths, levelData.walls || []);

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
        this._consecutiveWrongs = 0;
        this._moveHistory = [];
        // Base 3 undos + any inventory extraUndo powerups auto-consumed at level start
        const invAtStart = storage.getPowerups();
        this.undoCharges = 3 + (invAtStart.extraUndo || 0);
        if (invAtStart.extraUndo > 0) {
            for (let i = 0; i < invAtStart.extraUndo; i++) storage.usePowerup('extraUndo');
        }
        this._updateUndoButton();
        this._updatePowerupButtons();

        // Countdown timer — mode-aware (classic/timed/zen) + daily modifier overrides.
        this.gameMode = storage.getGameMode() || 'classic';
        const chapterId = chapterData.id;
        const [baseSec, perPathSec] = TIME_CONFIG[chapterId] || [60, 3.0];
        let limit = baseSec + Math.round(this.totalPaths * perPathSec);
        if (this.gameMode === 'timed') limit = Math.round(limit * 0.65);

        // Daily 'time' modifier tightens time further (independent of gameMode).
        if (this.dailyModifier && this.dailyModifier.type === 'time') {
            limit = Math.max(15, Math.round(limit * this.dailyModifier.multiplier));
        }

        this.timeLimit = limit;
        this.timeRemaining = limit;

        // Daily 'moves' modifier: cap attempts (moves + wrongMoves). 0 = uncapped.
        // When active, the countdown timer is paused — the player competes on
        // efficiency alone. (Otherwise both constraints apply and feel punishing.)
        if (this.dailyModifier && this.dailyModifier.type === 'moves') {
            this.moveLimit = this.totalPaths + (this.dailyModifier.extraMoves ?? 2);
        } else {
            this.moveLimit = 0;
        }

        const suppressTimer = this.moveLimit > 0;
        if (this.gameMode !== 'zen' && !suppressTimer) {
            this._startCountdown();
        } else {
            // Zen OR moves modifier: freeze timer display — no countdown pressure.
            this._updateTimerDisplay();
        }
        this._updateScoreDisplay();

        this.updateHintButton();
        this.startRenderLoop();

        // Zoom hint for large grids
        const zoomHint = document.getElementById('zoom-hint');
        if (zoomHint) {
            if (levelData.gridWidth > 20 || levelData.gridHeight > 20) {
                zoomHint.classList.remove('hidden');
                setTimeout(() => zoomHint.classList.add('hidden'), 3500);
            } else {
                zoomHint.classList.add('hidden');
            }
        }
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
        if (this.onTimeUp) this.onTimeUp();
    }

    _isMovesExhausted() {
        if (this.moveLimit <= 0) return false;
        return (this.moves + this.wrongMoves) >= this.moveLimit;
    }

    _handleMovesUp() {
        this._stopTimer();
        this.stopRenderLoop();
        if (this.onMovesUp) this.onMovesUp();
    }

    _updateTimerDisplay() {
        const el = document.getElementById('game-timer');
        if (!el) return;
        // Zen mode OR moves-mode daily: no countdown, show infinity.
        if (this.gameMode === 'zen' || this.moveLimit > 0) {
            el.textContent = '\u221E';
            el.classList.remove('timer-warning', 'timer-critical');
            return;
        }
        const totalSecs = Math.ceil(this.timeRemaining);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        const ratio = this.timeRemaining / this.timeLimit;
        el.classList.toggle('timer-warning', ratio < 0.3 && ratio >= 0.15);
        el.classList.toggle('timer-critical', ratio < 0.15);
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
        if (movesEl) {
            if (this.moveLimit > 0) {
                // Daily 'moves' mode: show remaining attempts (limit - used).
                const used = this.moves + this.wrongMoves;
                const remaining = Math.max(0, this.moveLimit - used);
                movesEl.textContent = `${remaining}`;
                movesEl.classList.toggle('moves-warning', remaining > 0 && remaining <= 2);
                movesEl.classList.toggle('moves-critical', remaining === 0);
            } else {
                movesEl.textContent = `${this.moves}/${this.totalPaths}`;
                movesEl.classList.remove('moves-warning', 'moves-critical');
            }
        }

        // Combo heat glow on game screen — tier bands at 3/5/8 for escalating intensity.
        const screen = document.getElementById('screen-game');
        if (screen) {
            screen.classList.remove('game-canvas-combo-3', 'game-canvas-combo-5', 'game-canvas-combo-8');
            if (this.combo >= 8) screen.classList.add('game-canvas-combo-8');
            else if (this.combo >= 5) screen.classList.add('game-canvas-combo-5');
            else if (this.combo >= 3) screen.classList.add('game-canvas-combo-3');
        }

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
        // Pinch-zoom and tap state shared across listeners.
        let lastPinchDist = 0;
        let lastPanX = 0;
        let lastPanY = 0;
        let isPinching = false;
        let pendingTapStart = null;     // { x, y, t } — potential single-finger tap
        let isSinglePanning = false;    // single-finger drag panning the grid
        let lastSinglePanX = 0;
        let lastSinglePanY = 0;
        let lastTapAt = 0;              // double-tap detection timestamp
        let lastTapPos = { x: 0, y: 0 };
        const TAP_MAX_MOVE = 14;        // px drift allowed before promoting tap→pan (iPhone fingers drift ~10-15px; lower = easier pan)
        const TAP_MAX_MS = 350;
        const DOUBLE_TAP_MS = 300;
        const DOUBLE_TAP_RADIUS = 40;
        // Finger-tip bias correction DISABLED. Tested 6 px and 3 px; both
        // values turned out to push the corrected position into the cell ABOVE
        // the user's actual finger when cell sizes were small (≤ 24 CSS px on
        // iPhones with wide grids). Net effect was MORE wrong-arrow misfires,
        // not fewer. Tier-1 EXACT-cell-hit is doing all the heavy lifting now;
        // no synthetic shift needed. Kept as a constant set to 0 so the
        // touch-end call site stays readable and we can re-enable easily.
        const TOUCH_Y_CORRECTION = 0;

        // Tap → path resolution: PURE Voronoi-style distance hit testing.
        //
        // We scan a 5x5 cell neighbourhood around the fractional tap position
        // and for every path that owns ANY cell in that area, compute the true
        // Euclidean distance from the tap to the path's NEAREST cell centre.
        // The path with the smallest distance wins. This is the geometrically
        // correct answer to "which arrow is the player's finger closest to?"
        //
        // Why we DROPPED Math.floor cell-snapping (Tier-1): at cell boundaries,
        // floor() rounds the tap to whichever cell index it lands in, and if
        // that cell happens to belong to arrow B while the player's finger is
        // essentially equidistant between A and B, B wins by accident — even
        // though A's centre might actually be closer. Pure distance scoring
        // never has this artefact: each arrow "owns" the Voronoi region
        // around its cells, and the finger lands in exactly one region.
        //
        // 5x5 search (vs old 3x3): catches very light/imprecise taps that
        // land further from any arrow. Combined with the 2.5-cell acceptance
        // threshold, even fingers that just brush the screen near an arrow
        // resolve correctly. Random empty-board taps still return null
        // because no path is within 2.5 cells.
        //
        // Blocked-path penalty (2.0): if a clear arrow and a blocked arrow
        // are at comparable distance, prefer the clear one — the player
        // almost always means to remove a clear arrow, not waste a tap on
        // a blocked one. The penalty is heavy enough to overcome ~2 cells
        // of distance, so the clear arrow has to be reasonably close.
        const findPathAt = (fx, fy) => {
            const cx = Math.floor(fx);
            const cy = Math.floor(fy);
            const seen = new Set();
            let best = null;
            let bestScore = Infinity;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const p = this.grid.getPathAt(cx + dx, cy + dy);
                    if (!p || seen.has(p)) continue;
                    seen.add(p);
                    let minD = Infinity;
                    for (const c of p.cells) {
                        const ddx = (c.x + 0.5) - fx;
                        const ddy = (c.y + 0.5) - fy;
                        const d = Math.hypot(ddx, ddy);
                        if (d < minD) minD = d;
                    }
                    const penalty = this.grid.isPathClear(p) ? 0 : 2.0;
                    const score = minD + penalty;
                    if (score < bestScore) { bestScore = score; best = p; }
                }
            }
            if (best && bestScore <= 2.5) return best;
            return null;
        };

        // Single-slot tap queue: when an animation is in flight, hold the
        // most recent tap and process it the instant the animation ends.
        // This is what makes "fire 5 arrows fast" feel snappy instead of
        // dropping inputs while the previous arrow snake-slides off-screen.
        // Stale taps (>400 ms old by the time we get to them) are discarded
        // so a forgotten queued tap doesn't surprise-fire much later.
        let queuedTap = null;
        this._processQueuedTap = () => {
            if (!queuedTap) return;
            const t = queuedTap;
            queuedTap = null;
            if (performance.now() - t.at < 400) {
                resolveTap(t.x, t.y);
            }
        };

        const resolveTap = (clientX, clientY) => {
            if (!this.grid) return;
            if (this.isAnimating) {
                queuedTap = { x: clientX, y: clientY, at: performance.now() };
                return;
            }
            const { fx, fy } = this.renderer.getFractionalCellFromPoint(clientX, clientY);
            const path = findPathAt(fx, fy);
            if (!path) return;
            this.hintedPath = null;
            this.renderer.touchFeedback = { path, startTime: performance.now() };
            if (this.grid.isPathClear(path)) {
                this.removePathWithAnimation(path);
            } else {
                this.handleWrongMove(path);
            }
        };

        // Mouse (desktop) uses click — touch path is handled via touchstart/touchend.
        this.canvas.addEventListener('click', (e) => {
            // Skip synthetic clicks that iOS fires after touchend when we didn't preventDefault.
            if (e.detail === 0) return;
            resolveTap(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Pinch begins — cancel any pending single-finger tap so the
                // gesture doesn't accidentally fire a wrong-move on start,
                // and clear the preview halo so the dragged-over arrow
                // doesn't keep glowing during the pinch.
                isPinching = true;
                pendingTapStart = null;
                this.renderer.previewPath = null;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist = Math.sqrt(dx * dx + dy * dy);
                lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                e.preventDefault();
                return;
            }
            if (e.touches.length === 1) {
                const t = e.touches[0];
                pendingTapStart = { x: t.clientX, y: t.clientY, at: performance.now() };
                isSinglePanning = false;
                lastSinglePanX = t.clientX;
                lastSinglePanY = t.clientY;
                e.preventDefault();
                // Predictive preview halo: from this touchstart until lift,
                // a bright yellow ring follows the path the finger is on.
                // The user can SEE which arrow will fire and slide their
                // finger to a different one before lifting. Drag-to-choose
                // UX, same model as iOS keyboard letter selection.
                if (!this.isAnimating && this.grid) {
                    const { fx, fy } = this.renderer.getFractionalCellFromPoint(t.clientX, t.clientY);
                    this.renderer.previewPath = findPathAt(fx, fy);
                }
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

                const scaleChange = dist / lastPinchDist;
                this.renderer.setZoom(this.renderer.scale * scaleChange, centerX, centerY);
                this.renderer.setPan(centerX - lastPanX, centerY - lastPanY);

                lastPinchDist = dist;
                lastPanX = centerX;
                lastPanY = centerY;
                this.renderer.drawGrid(this.grid);
                return;
            }
            // Single-finger drift > threshold cancels the pending tap and
            // promotes the gesture to a single-finger pan (drag-to-scroll the
            // grid). Once panning begins we keep translating the view until
            // the finger lifts — matches the user's mental model of "drag
            // empty space to look around" on iOS.
            if (e.touches.length === 1) {
                const t = e.touches[0];
                if (pendingTapStart && !isSinglePanning) {
                    const dx = t.clientX - pendingTapStart.x;
                    const dy = t.clientY - pendingTapStart.y;
                    if (Math.hypot(dx, dy) > TAP_MAX_MOVE) {
                        pendingTapStart = null;
                        isSinglePanning = true;
                        lastSinglePanX = t.clientX;
                        lastSinglePanY = t.clientY;
                        // Tap promoted to pan — clear the preview halo so
                        // dragged-over arrows don't keep glowing.
                        this.renderer.previewPath = null;
                    } else if (!this.isAnimating && this.grid) {
                        // Drag-to-choose: while the finger is still within
                        // tap-tolerance, update the preview halo to whichever
                        // arrow is now closest. Lets the player visually
                        // scrub between adjacent arrows; touchend then fires
                        // exactly the one currently haloed.
                        const { fx, fy } = this.renderer.getFractionalCellFromPoint(t.clientX, t.clientY);
                        this.renderer.previewPath = findPathAt(fx, fy);
                    }
                }
                if (isSinglePanning) {
                    e.preventDefault();
                    this.renderer.setPan(t.clientX - lastSinglePanX, t.clientY - lastSinglePanY);
                    lastSinglePanX = t.clientX;
                    lastSinglePanY = t.clientY;
                    this.renderer.drawGrid(this.grid);
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            // Suppress the iOS synthetic click that fires ~300ms after touchend.
            // We resolve the tap ourselves below — letting the click also fire
            // would double-trigger resolveTap on some iOS versions where
            // event.detail !== 0 on the synthetic click and the click handler's
            // guard fails. cancelable is false on stale events, so guard.
            if (e.cancelable) e.preventDefault();
            if (isPinching) {
                // Only reset when all fingers lift; a 2→1 transition shouldn't
                // leave a dangling pending tap.
                if (e.touches.length === 0) isPinching = false;
                return;
            }
            if (isSinglePanning) {
                if (e.touches.length === 0) isSinglePanning = false;
                return;
            }
            if (!pendingTapStart) return;
            const now = performance.now();
            if (now - pendingTapStart.at > TAP_MAX_MS) { pendingTapStart = null; return; }

            // Double-tap detection — fires before resolveTap so a quick repeat
            // resets the view instead of acting on an arrow.
            const isDoubleTap = (now - lastTapAt) < DOUBLE_TAP_MS
                && Math.hypot(pendingTapStart.x - lastTapPos.x, pendingTapStart.y - lastTapPos.y) < DOUBLE_TAP_RADIUS;
            lastTapAt = now;
            lastTapPos = { x: pendingTapStart.x, y: pendingTapStart.y };

            if (isDoubleTap) {
                lastTapAt = 0; // consume — prevent triple-tap re-trigger
                this.renderer.resetView(this.grid);
                this.renderer.drawGrid(this.grid);
                pendingTapStart = null;
                return;
            }

            // Drag-to-choose model: fire whichever arrow is currently shown
            // by the preview halo. Touchstart sets the halo to the path
            // under the finger; touchmove updates it as the finger drifts
            // within tap tolerance; we now fire that exact path on lift —
            // so what the player saw IS what fires. Falls back to a fresh
            // resolveTap from touchstart coords if previewPath happened to
            // be null (e.g. brand-new tap on an empty edge).
            const liveTap = e.changedTouches && e.changedTouches[0];
            const fireX = liveTap ? liveTap.clientX : pendingTapStart.x;
            const fireY = liveTap ? liveTap.clientY : pendingTapStart.y;
            const haloPath = this.renderer.previewPath;
            this.renderer.previewPath = null;
            if (haloPath && !haloPath.isRemoved()) {
                this.hintedPath = null;
                this.renderer.touchFeedback = { path: haloPath, startTime: performance.now() };
                if (this.grid.isPathClear(haloPath)) {
                    this.removePathWithAnimation(haloPath);
                } else {
                    this.handleWrongMove(haloPath);
                }
            } else {
                resolveTap(fireX, fireY);
            }
            pendingTapStart = null;
        }, { passive: false });

        // iOS sometimes fires touchcancel instead of touchend (incoming call,
        // system gesture, app switch). Reset the same state we'd reset on
        // touchend so a stale preview halo doesn't get stuck on screen and
        // a stranded pendingTapStart doesn't fire when the user comes back.
        this.canvas.addEventListener('touchcancel', () => {
            pendingTapStart = null;
            isSinglePanning = false;
            isPinching = false;
            this.renderer.previewPath = null;
        });

        // Mouse wheel zoom — passes client coords; renderer converts to canvas-local.
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.grid) return;
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.renderer.setZoom(this.renderer.scale * zoomFactor, e.clientX, e.clientY);
            this.renderer.drawGrid(this.grid);
        }, { passive: false });
    }

    removePathWithAnimation(path) {

        this.isAnimating = true;
        // Snapshot BEFORE removing — undo restores path.state to this and re-runs updateRemovableStates.
        // We also snapshot the PREVIOUS removable set so undo doesn't retroactively invalidate hints.
        this._moveHistory.push({
            pathRef: path,
            prevState: path.state,
            snakeCells: path.cells.map(c => ({ x: c.x, y: c.y })),
            score: this.score,
            combo: this.combo,
            moves: this.moves,
            consecutiveWrongs: this._consecutiveWrongs,
        });
        if (this._moveHistory.length > 20) this._moveHistory.shift();

        this.grid.removePath(path);

        // Scoring: correct move
        this.combo++;
        this.moves++;
        this._consecutiveWrongs = 0;
        // Successful play dismisses the auto-hint — player doesn't need it anymore.
        this.hintedPath = null;
        // Onboarding pointer steps once per correct tap. After ~3 taps the
        // player has clearly internalized the mechanic, so we let them
        // play unguided. localStorage flag persists so it never re-shows.
        if (this.onboardingActive && this.onboardingTapsLeft > 0) {
            this.onboardingTapsLeft--;
            if (this.onboardingTapsLeft <= 0) {
                this.onboardingActive = false;
                try { localStorage.setItem('okchu_onboarding_done', '1'); } catch {}
            }
        }
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        // Haptic feedback — scales with combo for reward feel. Uses native
        // Capacitor Haptics on iOS (Taptic Engine) since navigator.vibrate
        // is silently no-op'd on iOS Safari/WKWebView.
        if (this.combo >= 5) tapMedium(); else tapLight();
        const points = this._calculatePoints(path);
        this.score += points;
        this._updateScoreDisplay();
        this._showFloatingScore(points, path);




        // Combo-scaled particle burst
        const head = path.getHead();
        const burstCx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const burstCy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;
        const dirVec = getDirectionVector(path.direction);
        const burstAngle = Math.atan2(dirVec.dy, dirVec.dx);

        const tier = COMBO_TIERS.find(t => this.combo >= t.min);
        const colorIdx = Math.min(Math.floor(this.combo / 2), COMBO_COLORS.length - 1);

        this.renderer.burstParticles.burst(burstCx, burstCy, tier.burstCount, {
            speed: tier.burstSpeed,
            spread: Math.PI * 0.8,
            angle: burstAngle,
            life: 0.5 + this.combo * 0.05,
            size: 2 + this.combo * 0.3,
            colors: [COMBO_COLORS[colorIdx], '#ffffff', this.renderer.theme.arrowIdle],
            gravity: 80,
            shape: tier.shape,
        });

        if (tier.shake > 0) {
            this._doScreenShake(tier.shake, 80 + this.combo * 10);
        }

        if (this.combo >= MEGA_COMBO_THRESHOLD) {
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
                this._updateUndoButton();
                this._updatePowerupButtons();
                this.renderer.drawGrid(this.grid);
                // Process any tap that landed mid-animation so the player's
                // chained inputs don't get dropped — keeps the game snappy.
                if (this._processQueuedTap) this._processQueuedTap();
                if (this.grid.isCleared()) {
                    this.handleLevelComplete();
                } else if (this._isMovesExhausted()) {
                    this._handleMovesUp();
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
        notifyError(); // hard thump for wrong-move + life lost
        if (this.onLivesChanged) this.onLivesChanged(remaining);

        // Scoring: wrong move breaks combo + time penalty
        this.combo = 0;
        this.wrongMoves++;
        this._consecutiveWrongs++;
        this._updateScoreDisplay();

        // Auto-hint after 2 consecutive wrong moves — shows a removable path
        // as gentle guidance without consuming the player's free hint charge.
        if (this._consecutiveWrongs >= 2 && !this.hintedPath) {
            const hintPath = this.hintManager.findHintArrow(this.grid);
            if (hintPath) {
                this.hintedPath = hintPath;
                this.renderer.drawGrid(this.grid);
                this.renderer.drawHintHighlight(hintPath);
            }
        }

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
                if (this._processQueuedTap) this._processQueuedTap();

                if (remaining <= 0) {
                    if (this.onNoLives) this.onNoLives();
                } else if (this._isMovesExhausted()) {
                    this._handleMovesUp();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    handleLevelComplete() {
        this._stopTimer();
        // Celebratory triple-thump — feels like a "victory" cue on iOS Taptic Engine.
        tapHeavy();
        setTimeout(() => tapHeavy(), 80);
        setTimeout(() => tapMedium(), 180);
        const elapsedTime = Math.round((this.timeLimit - this.timeRemaining) * 1000);
        storage.completeLevel(this.currentLevel.id, this.currentChapter.id);

        // Time bonus: 2 points per second remaining — skipped in moves mode
        // because the timer is frozen and would award a misleading full bonus.
        const timeBonus = this.moveLimit > 0 ? 0 : Math.round(this.timeRemaining * 2);
        this.score += timeBonus;

        // Perfect bonus (no wrong moves)
        if (this.wrongMoves === 0) this.score += 200;

        // Daily challenge bonus: +50% score for beating the daily modifier.
        let dailyBonus = 0;
        if (this.dailyModifier) {
            dailyBonus = Math.round(this.score * 0.5);
            this.score += dailyBonus;
        }

        const stars = this.calculateStars();
        const prevScore = storage.getLevelScore(this.currentLevel.id);
        const prevStars = prevScore?.stars || 0;

        // Save score
        storage.saveLevelScore(this.currentLevel.id, {
            score: this.score,
            stars,
            moves: this.moves,
            wrongMoves: this.wrongMoves,
            time: elapsedTime,
            bestCombo: this.maxCombo,
        });

        // Grant power-ups on new 3-star completion
        let rewardedPowerup = null;
        if (stars === 3 && prevStars < 3) {
            const pool = ['hint', 'freeze', 'extraUndo'];
            const pick = pool[Math.floor(Math.random() * pool.length)];
            storage.earnPowerup(pick, 1);
            rewardedPowerup = pick;
        }

        // Collect chapter artifact when a chapter reaches 13+ stars and not yet collected
        let newArtifact = null;
        if (this.currentChapter && !storage.hasArtifact(this.currentChapter.id)) {
            if (storage.getChapterStars(this.currentChapter.id) >= 13) {
                if (storage.collectArtifact(this.currentChapter.id)) {
                    newArtifact = this.currentChapter.id;
                }
            }
        }

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
                    rewardedPowerup,
                    newArtifact,
                    dailyBonus,
                    dailyModifier: this.dailyModifier,
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

    undoLastMove() {
        if (this.isAnimating) return false;
        if (this.undoCharges <= 0) return false;
        const last = this._moveHistory.pop();
        if (!last) return false;

        const path = last.pathRef;
        // Restore cell positions (in case snake animation offset them)
        for (let i = 0; i < path.cells.length; i++) {
            path.cells[i].x = last.snakeCells[i].x;
            path.cells[i].y = last.snakeCells[i].y;
        }
        path._snakeCellStates = null;
        path.state = last.prevState;
        this.score = last.score;
        this.combo = last.combo;
        this.moves = last.moves;
        this._consecutiveWrongs = last.consecutiveWrongs;
        this.undoCharges--;

        this.grid.updateRemovableStates();
        this._updateScoreDisplay();
        this._updateUndoButton();
        this.renderer.drawGrid(this.grid);
        return true;
    }

    _updateUndoButton() {
        const btn = document.getElementById('btn-undo');
        if (!btn) return;
        const countEl = document.getElementById('undo-count');
        if (countEl) countEl.textContent = this.undoCharges;
        btn.disabled = this.undoCharges <= 0 || this._moveHistory.length === 0;
        btn.style.opacity = btn.disabled ? '0.35' : '1';
    }

    useHint() {
        if (!this.grid) return;

        const hintPath = this.hintManager.findHintArrow(this.grid);
        if (!hintPath) return;

        // Prefer inventory hint; fall back to free-per-level hint
        const invPowerups = storage.getPowerups();
        if (invPowerups.hint > 0) {
            storage.usePowerup('hint');
        } else if (this.hintManager.hasFreeHint()) {
            this.hintManager.useFreeHint();
        } else {
            return;
        }

        this.usedHint = true;
        this.hintedPath = hintPath;
        this.renderer.drawGrid(this.grid);
        this.renderer.drawHintHighlight(hintPath);
        this.updateHintButton();
        this._updatePowerupButtons();
    }

    updateHintButton() {
        const btn = document.getElementById('btn-hint');
        if (btn) btn.style.opacity = this.hintManager.hasFreeHint() ? '1' : '0.4';
    }

    useFreezePowerup() {
        if (!this.grid || this.timeLimit <= 0) return;
        if (!storage.usePowerup('freeze')) return;
        // +15s to the timer
        this.timeRemaining = Math.min(this.timeLimit, this.timeRemaining + 15);
        this._updateScoreDisplay();
        this._updatePowerupButtons();
        // Brief visual pulse on the timer
        const el = document.getElementById('game-timer');
        if (el) {
            el.classList.add('timer-freeze-pulse');
            setTimeout(() => el.classList.remove('timer-freeze-pulse'), 900);
        }
    }

    _updatePowerupButtons() {
        const p = storage.getPowerups();
        const hintBtn = document.getElementById('btn-powerup-hint');
        const freezeBtn = document.getElementById('btn-powerup-freeze');
        const hintCount = document.getElementById('powerup-hint-count');
        const freezeCount = document.getElementById('powerup-freeze-count');
        if (hintCount) hintCount.textContent = p.hint;
        if (freezeCount) freezeCount.textContent = p.freeze;
        if (hintBtn) {
            const canUseHint = p.hint > 0 || (this.currentLevel && this.hintManager.hasFreeHint());
            hintBtn.disabled = !canUseHint || this.hintedPath !== null;
            hintBtn.style.opacity = hintBtn.disabled ? '0.4' : '1';
        }
        if (freezeBtn) {
            const canUseFreeze = p.freeze > 0 && this.timeLimit > 0;
            freezeBtn.disabled = !canUseFreeze;
            freezeBtn.style.opacity = freezeBtn.disabled ? '0.4' : '1';
        }
    }

    startRenderLoop() {
        this.stopRenderLoop();
        const loop = (time) => {
            this.renderer.tick(time);
            if (!this.isAnimating && this.grid) {
                this.renderer.drawGrid(this.grid);
                // Predictive selection halo: drawn while the player's finger
                // is down so they can SEE which arrow will fire on lift.
                // Cleared in touchend / pan-promotion handlers.
                if (this.renderer.previewPath && !this.renderer.previewPath.isRemoved()) {
                    this.renderer.drawPreviewHalo(this.renderer.previewPath);
                }
                // Onboarding pointer: pulse on the next removable arrow until
                // the new player has tapped a few times. Drawn after drawGrid
                // so it sits on top. Picks the first removable path each
                // frame so it auto-advances as arrows get cleared.
                if (this.onboardingActive && this.onboardingTapsLeft > 0) {
                    const target = this.grid.paths.find(p => !p.isRemoved() && this.grid.isPathClear(p));
                    if (target) this.renderer.drawOnboardingPointer(target);
                }
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
