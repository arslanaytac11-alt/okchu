// js/game.js

import { Grid } from './grid.js';
import { updateRuneHud, bindRuneHelp, RUNE_GLYPHS } from './rune-hud.js';
import { hitTestPath } from './hit-test.js';
import { Renderer } from './renderer.js?v=7';
import { LivesManager } from './lives.js';
import { HintManager } from './hints.js';
import { storage } from './storage.js';
import { isLocalReviewMode } from './preview-mode.js';
import { getNextLevel } from './levels.js';
import { getDirectionVector } from './arrow.js';
import { tapLight, tapMedium, tapHeavy, notifyError } from './haptics.js';
import { t } from './i18n.js?v=2';
import { getPuzzleTimeLimit, BOARD_VISUALS } from './balance.js?v=4';
import { createArrowRoute, sampleArrowMotion, arrowExitDistance, arrowDepartureEase, assignBalancedArrowColors } from './arrow-motion.js?v=3';

// Map chapter id (1-10) to its difficulty translation key. Mirrors the table
// in screens.js so the in-game header label localises the same way the level-
// select chapter label does. Without this, `chapterData.difficulty` (which is
// the hardcoded TR string "Kolay" / "Orta" / etc baked into chapters.js) leaked
// into every non-Turkish locale.
const DIFFICULTY_KEYS = {
    1: 'easy', 2: 'medium', 3: 'hard', 4: 'hard_plus', 5: 'very_hard',
    6: 'very_hard_plus', 7: 'legendary', 8: 'legendary_plus', 9: 'nightmare', 10: 'nightmare_plus',
};
function localizedDifficulty(chapter) {
    const k = DIFFICULTY_KEYS[chapter?.id] || 'easy';
    const v = t('difficulty.' + k);
    return v === 'difficulty.' + k ? (chapter?.difficulty || '') : v;
}

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
        this._levelEpoch = 0;
        this._active = false;
        this._outcome = null;
        this._animationRestore = null;
        this._blockedFeedbackToken = 0;
        this.hintedPath = null;
        // The first campaign puzzle guides three successful taps once.
        this.onboardingActive = false;
        this.onboardingTapsLeft = 0;
        this.onLevelComplete = null;
        this.onNoLives = null;
        this.onLivesChanged = null;
        this.onScoreChanged = null;
        this._renderLoopId = null;
        this._timerInterval = null;
        this._visibilityHidden = typeof document !== 'undefined' && document.hidden === true;

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

        // Track consecutive wrong moves for undo snapshots.
        this._consecutiveWrongs = 0;
        // Undo history: last N successful moves, capped at UNDO_MAX
        this._moveHistory = [];
        this.undoCharges = 3;

        // Zen mode: no timer, no wrong-move penalties — casual solve
        this.zenMode = false;

        this._runeNotice = null;
        this._runeHelpOpen = false;
        bindRuneHelp(() => this.setRuneHelpOpen(true), () => this.setRuneHelpOpen(false));
        this.setupInput();
    }

    startLevel(levelData, chapterData, opts = {}) {
        this.leaveLevel();
        this._active = true;
        this._outcome = null;
        this.currentLevel = levelData;
        this.currentChapter = chapterData;
        this.hintedPath = null;
        this.dailyModifier = opts.dailyModifier || null;
        let onboardingDone = false;
        try { onboardingDone = localStorage.getItem('okchu_onboarding_done') === '1'; } catch {}
        this.onboardingActive = !isLocalReviewMode() && levelData.id === 'egypt_1' && !this.dailyModifier && !opts.isDailyChallenge &&
            !storage.isLevelCompleted(levelData.id) && !onboardingDone;
        this.onboardingTapsLeft = this.onboardingActive ? 3 : 0;
        this._updateGameFeedback();
        this.applyChapterTheme(chapterData);
        // Persist resume point so the Play button on the next launch jumps
        // straight back to this chapter's level list. Skip for daily
        // challenges — those are one-off and shouldn't override the campaign
        // resume point.
        if (!opts.dailyModifier && !opts.isDailyChallenge && chapterData?.id && levelData?.id) {
            try { storage.setLastPlayed(chapterData.id, levelData.id); } catch {}
        }

        this.grid = new Grid(levelData.gridWidth, levelData.gridHeight);
        this.grid.loadFromData(levelData.paths, levelData.walls || [], levelData.runeCycle || []);
        updateRuneHud(this.grid);
        this._updateGameFeedback();
        assignBalancedArrowColors(this.grid.paths);

        this.renderer.setTheme(chapterData.theme, chapterData.id);
        this.renderer.setBoardShape(levelData.shape, levelData.gridWidth, levelData.gridHeight, levelData.boardCells);
        this.renderer.resize(levelData.gridWidth, levelData.gridHeight);
        this.renderer.drawGrid(this.grid);

        this.hintManager.setLevel(levelData.id);

        const shapeKey = `shapes.${levelData.shape}`;
        const translatedShape = levelData.shape ? t(shapeKey) : '';
        const levelName = translatedShape && translatedShape !== shapeKey ? translatedShape : levelData.name;
        document.getElementById('level-name').textContent = `${levelName} · ${((levelData.level || 1) - 1) % 5 + 1}/5`;
        document.getElementById('level-difficulty').textContent = localizedDifficulty(chapterData);

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
        this.undoCharges = this.grid.hasRuneOrder() ? Infinity : 3 + (invAtStart.extraUndo || 0);
        if (!this.grid.hasRuneOrder() && invAtStart.extraUndo > 0) {
            for (let i = 0; i < invAtStart.extraUndo; i++) storage.usePowerup('extraUndo');
        }
        this._updateUndoButton();

        // Countdown timer — mode-aware (classic/timed/zen) + daily modifier overrides.
        // Daily constraints apply equally to everyone; the campaign's Zen
        // preference must not disable its countdown or attempt limit.
        this.gameMode = this.dailyModifier || opts.isDailyChallenge ? 'classic' : storage.getGameMode() || 'classic';
        document.body.dataset.gameMode = this.gameMode;
        this.zenMode = this.gameMode === 'zen';
        const limit = getPuzzleTimeLimit(levelData, this.gameMode, this.dailyModifier);

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
        this._updatePowerupButtons();
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
            if (this.renderer.cellSize < 26) {
                zoomHint.classList.remove('hidden');
                setTimeout(() => zoomHint.classList.add('hidden'), 3500);
            } else {
                zoomHint.classList.add('hidden');
            }
        }
    }

    leaveLevel() {
        this._stopTimer();
        this.stopRenderLoop();
        this._active = false;
        this._levelEpoch++;
        this.onboardingActive = false;
        this.onboardingTapsLeft = 0;
        this._runeNotice = null;
        this._runeHelpOpen = false;
        updateRuneHud(null);
        document.getElementById('overlay-rune-help')?.classList.add('hidden');
        this._clearBlockedFeedback();
        if (this._animationRestore) this._animationRestore();
        this._animationRestore = null;
        this.isAnimating = false;
        this.renderer.previewPath = null;
        // A low-time warning belongs to this timed attempt, never the next board.
        this.renderer.setVignetteAlpha(0);
        if (this._resetInput) this._resetInput();
    }

    _updateGameFeedback() {
        const element = document.getElementById('game-feedback');
        if (!element) return;
        const stuck = this._active && this.grid?.hasRuneOrder() && !this.isAnimating && !this.grid.isCleared() && this.grid.getRemovablePaths().length === 0;
        const key = this._runeNotice || (stuck ? 'runes.stuck' : this.renderer.blockedFeedback ? 'game.blocked_feedback' : this.onboardingActive ? 'game.guided_feedback' : '');
        const message = key ? t(key).replace('{rune}', RUNE_GLYPHS[this.grid?.getCurrentRune()] || '') : '';
        element.textContent = message === key ? '' : message;
    }

    _clearBlockedFeedback() {
        this._blockedFeedbackToken++;
        const source = this.renderer.blockedFeedback?.path;
        if (source) source._flashColor = null;
        this.renderer.clearBlockedFeedback();
        this._updateGameFeedback();
    }

    _showBlockedFeedback(path, blocker, epoch) {
        if (!blocker || !this._active || epoch !== this._levelEpoch) return;
        this.renderer.showBlockedFeedback(path, blocker, 900);
        const token = ++this._blockedFeedbackToken;
        this._updateGameFeedback();
        this.renderer.drawGrid(this.grid);
        setTimeout(() => {
            if (epoch !== this._levelEpoch || token !== this._blockedFeedbackToken) return;
            this._clearBlockedFeedback();
            if (this._active) this.renderer.drawGrid(this.grid);
        }, 900);
    }

    setRuneHelpOpen(open) {
        this._runeHelpOpen = !!open;
        if (this._resetInput) this._resetInput();
        if (open) this._stopTimer();
        else if (this._active && !this._outcome && !this.zenMode && !this.moveLimit) this._startCountdown();
    }

    resumeLevel(seconds) {
        this._active = true;
        updateRuneHud(this.grid);
        this._updateGameFeedback();
        this._outcome = null;
        this.timeRemaining = seconds;
        if (!this.zenMode && !this.moveLimit) this._startCountdown();
        this.startRenderLoop();
    }

    handleVisibilityChange(hidden) {
        const wasHidden = this._visibilityHidden;
        this._visibilityHidden = !!hidden;
        this._lastTick = Date.now();
        if (hidden) {
            this._stopTimer();
            if (this._resetInput) this._resetInput();
            return;
        }
        if (this._active && !this._outcome && !this.zenMode && !this.moveLimit && (wasHidden || !this._timerInterval)) {
            this._startCountdown();
        }
    }

    _startCountdown() {
        this._stopTimer();
        this._lastTick = Date.now();
        if (!this._active || this._outcome || this.zenMode || this.moveLimit || this._visibilityHidden || document.hidden === true || this._runeHelpOpen) return;
        this._timerInterval = setInterval(() => {
            const now = Date.now();
            if (this._visibilityHidden || document.hidden === true) {
                this._lastTick = now;
                return;
            }
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
        if (!this._active || this._outcome) return;
        this.leaveLevel();
        this._outcome = 'time-up';
        this._stopTimer();
        this.stopRenderLoop();
        if (this.onTimeUp) this.onTimeUp();
    }

    _isMovesExhausted() {
        if (this.moveLimit <= 0) return false;
        return (this.moves + this.wrongMoves) >= this.moveLimit;
    }

    _handleMovesUp() {
        if (!this._active || this._outcome) return;
        this.leaveLevel();
        this._outcome = 'moves-up';
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
            if (comboEl.parentElement) comboEl.parentElement.classList.toggle('combo-stat-active', this.combo > 1);
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
        const timed = this.gameMode === 'timed' && !this.dailyModifier;
        const ratio = this.timeLimit > 0 ? this.timeRemaining / this.timeLimit : 0;
        if (this.wrongMoves === 0 && !this.usedHint && (!timed || ratio >= 0.3)) return 3;
        if (this.wrongMoves <= 2) return 2;
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
        document.body.dataset.chapter = String(chapterData.id);
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
        let lastTapWasEmpty = false;
        let lastTouchEnd = -Infinity;
        let blockedGesture = false;
        let precisionTimer = null;
        let precisionArmed = false;
        const PRECISION_DELAY = 180;
        const PRECISION_MAX_MS = 5000;
        const clearPrecision = () => {
            if (precisionTimer !== null) clearTimeout(precisionTimer);
            precisionTimer = null;
            precisionArmed = false;
        };
        const sameContact = (touch, pending) => pending.identifier === undefined || touch?.identifier === pending.identifier;
        const findPathAt = (clientX, clientY) => hitTestPath(this.grid, this.renderer, clientX, clientY);

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
            if (isPinching || isSinglePanning || blockedGesture) return;
            if (t.epoch === this._levelEpoch && performance.now() - t.at < 400) {
                this._clearBlockedFeedback();
                firePath(t.path);
            }
        };

        const resolveTap = (clientX, clientY) => {
            if (!this.grid || !this._active) return;
            this._clearBlockedFeedback();
            if (this.isAnimating) {
                queuedTap = { path: findPathAt(clientX, clientY), at: performance.now(), epoch: this._levelEpoch };
                return;
            }
            firePath(findPathAt(clientX, clientY));
        };

        const firePath = (path) => {
            if (!this._active || !path || !this.grid.paths.includes(path) || path.isRemoved() || path.state === 'removing') return;
            if (this._isMovesExhausted()) return;
            if (!this.zenMode && !this.livesManager.hasLives()) {
                if (this.onNoLives) this.onNoLives();
                return;
            }
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
            if (e.detail === 0 || performance.now() - lastTouchEnd < 700) return;
            resolveTap(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (!this._active || !this.grid) return;
            if (blockedGesture || e.touches.length > 2) {
                clearPrecision();
                blockedGesture = true;
                pendingTapStart = null;
                isPinching = false;
                isSinglePanning = false;
                queuedTap = null;
                this.renderer.previewPath = null;
                e.preventDefault();
                return;
            }
            if (e.touches.length === 2) {
                // Pinch begins — cancel any pending single-finger tap so the
                // gesture doesn't accidentally fire a wrong-move on start,
                // and clear the preview halo so the dragged-over arrow
                // doesn't keep glowing during the pinch.
                isPinching = true;
                clearPrecision();
                queuedTap = null;
                isSinglePanning = false;
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
                if (isPinching) { e.preventDefault(); return; }
                const t = e.touches[0];
                clearPrecision();
                pendingTapStart = { x: t.clientX, y: t.clientY, lastX:t.clientX, lastY:t.clientY,
                    identifier:t.identifier, at: performance.now(), epoch:this._levelEpoch };
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
                    this.renderer.previewPath = findPathAt(t.clientX, t.clientY);
                }
                if (findPathAt(t.clientX,t.clientY)) {
                    const contact = pendingTapStart;
                    precisionTimer = setTimeout(() => {
                        precisionTimer = null;
                        if (!this._active || contact !== pendingTapStart || contact.epoch !== this._levelEpoch ||
                            blockedGesture || isPinching || isSinglePanning) return;
                        const path = findPathAt(contact.lastX,contact.lastY);
                        if (!path) return;
                        const r = this.renderer, rect = this.canvas.getBoundingClientRect();
                        const size = r.cellSize*r.scale*Math.min(rect.width/(r._cssWidth||rect.width),rect.height/(r._cssHeight||rect.height));
                        const previous = {scale:r.scale,panX:r.panX,panY:r.panY};
                        if (size>0 && size<30) r.setZoom(r.scale*30/size,contact.lastX,contact.lastY);
                        if (findPathAt(contact.lastX,contact.lastY) !== path) {
                            Object.assign(r,previous);
                            return;
                        }
                        precisionArmed = true;
                        this.renderer.previewPath = path;
                        r.drawGrid(this.grid);
                        tapLight();
                    }, PRECISION_DELAY);
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (blockedGesture || e.touches.length > 2) {
                clearPrecision();
                blockedGesture = true;
                pendingTapStart = null;
                queuedTap = null;
                this.renderer.previewPath = null;
                e.preventDefault();
                return;
            }
            if (e.touches.length === 2 && !isPinching) {
                this._resetInput();
                blockedGesture = true;
                e.preventDefault();
                return;
            }
            if (e.touches.length === 2 && isPinching) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                if (dist < 8 || lastPinchDist < 8) {
                    lastPinchDist = dist;
                    lastPanX = centerX;
                    lastPanY = centerY;
                    return;
                }
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
                    if (!sameContact(t,pendingTapStart)) { this._resetInput(); blockedGesture=true; return; }
                    pendingTapStart.lastX = t.clientX;
                    pendingTapStart.lastY = t.clientY;
                    const dx = t.clientX - pendingTapStart.x;
                    const dy = t.clientY - pendingTapStart.y;
                    if (Math.hypot(dx, dy) > TAP_MAX_MOVE) {
                        clearPrecision();
                        queuedTap = null;
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
                        this.renderer.previewPath = findPathAt(t.clientX, t.clientY);
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
            lastTouchEnd = performance.now();
            // Suppress the iOS synthetic click that fires ~300ms after touchend.
            // We resolve the tap ourselves below — letting the click also fire
            // would double-trigger resolveTap on some iOS versions where
            // event.detail !== 0 on the synthetic click and the click handler's
            // guard fails. cancelable is false on stale events, so guard.
            if (e.cancelable) e.preventDefault();
            if (blockedGesture) {
                if (e.touches.length === 0) this._resetInput();
                return;
            }
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
            if (e.touches.length > 0 || e.changedTouches?.length > 1) {
                this._resetInput(); blockedGesture = e.touches.length>0; return;
            }
            const now = performance.now();
            const maxDuration = precisionArmed ? PRECISION_MAX_MS : TAP_MAX_MS;
            if (now - pendingTapStart.at > maxDuration) { clearPrecision(); pendingTapStart = null; this.renderer.previewPath = null; return; }

            lastTouchEnd = now;
            const liveTap = e.changedTouches && Array.from(e.changedTouches).find(t=>sameContact(t,pendingTapStart));
            if (pendingTapStart.identifier !== undefined && !liveTap) { this._resetInput(); return; }
            const fireX = liveTap ? liveTap.clientX : pendingTapStart.x;
            const fireY = liveTap ? liveTap.clientY : pendingTapStart.y;
            if (Math.hypot(fireX - pendingTapStart.x, fireY - pendingTapStart.y) > TAP_MAX_MOVE) {
                clearPrecision();
                pendingTapStart = null;
                this.renderer.previewPath = null;
                return;
            }
            // Resolve at lift, including a final movement with no touchmove event.
            // Blank-space double taps reset the view; arrow taps always play.
            const path = findPathAt(fireX, fireY);
            const isDoubleTap = !path && lastTapWasEmpty && (now - lastTapAt) < DOUBLE_TAP_MS
                && Math.hypot(fireX - lastTapPos.x, fireY - lastTapPos.y) < DOUBLE_TAP_RADIUS;
            lastTapAt = now;
            lastTapPos = { x: fireX, y: fireY };
            lastTapWasEmpty = !path;
            clearPrecision();
            this.renderer.previewPath = null;
            if (isDoubleTap) {
                lastTapWasEmpty = false;
                this.renderer.resetView(this.grid);
                this.renderer.drawGrid(this.grid);
            } else {
                resolveTap(fireX, fireY);
            }
            pendingTapStart = null;
        }, { passive: false });

        this._resetInput = () => {
            clearPrecision();
            blockedGesture = false;
            pendingTapStart = null;
            isSinglePanning = false;
            isPinching = false;
            queuedTap = null;
            lastTapAt = 0;
            lastTapWasEmpty = false;
            this.renderer.previewPath = null;
        };
        this.canvas.addEventListener('touchcancel', this._resetInput);

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
        if (!this._active || this.isAnimating || !this.grid.paths.includes(path) || path.isRemoved()) return;
        if (this.grid.hasRuneOrder() && !this.grid.isPathClear(path)) { this.handleWrongMove(path); return; }
        this._runeNotice = null;
        this._clearBlockedFeedback();
        const epoch = this._levelEpoch;
        this.isAnimating = true;
        // Snapshot BEFORE removing — undo restores path.state to this and re-runs updateRemovableStates.
        // We also snapshot the PREVIOUS removable set so undo doesn't retroactively invalidate hints.
        const snapshot = {
            pathRef: path,
            prevState: path.state,
            snakeCells: path.cells.map(c => ({ x: c.x, y: c.y })),
            score: this.score,
            combo: this.combo,
            maxCombo: this.maxCombo,
            moves: this.moves,
            consecutiveWrongs: this._consecutiveWrongs,
        };
        this._moveHistory.push(snapshot);
        if (!this.grid.hasRuneOrder() && this._moveHistory.length > 20) this._moveHistory.shift();

        this.grid.removePath(path);

        // Scoring: correct move
        this.combo++;
        this.moves++;
        this._consecutiveWrongs = 0;
        // Successful play dismisses the player's manual hint.
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
            this._updateGameFeedback();
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




        // A fixed-length body follows its own bends out through the exit.
        // Logical cells stay untouched, so resizing, undo, and cancellation
        // always refer to the original puzzle. Only visual geometry moves.
        const route = createArrowRoute(path.cells, path.direction);
        const reducedMotion = this.renderer.reducedMotion;
        this._animationRestore = () => {
            path._visualGeometry = null;
            path.state = snapshot.prevState;
            this.score = snapshot.score;
            this.combo = snapshot.combo;
            this.maxCombo = snapshot.maxCombo;
            this.moves = snapshot.moves;
            this._consecutiveWrongs = snapshot.consecutiveWrongs;
            if (this._moveHistory[this._moveHistory.length - 1] === snapshot) this._moveHistory.pop();
            this.grid.updateRemovableStates();
        };
        const startTime = performance.now();
        let travelDistance = arrowExitDistance(route, this.renderer.getVisibleGridBounds());
        let travelled = 0, previousEase = 0;
        const totalDuration = reducedMotion ? 120 : Math.min(360, 240 + route.length * 7);
        path._visualGeometry = sampleArrowMotion(route);

        const animate = (time) => {
            if (epoch !== this._levelEpoch || !this._active) return;
            const elapsed = Math.max(0, time - startTime);
            const progress = Math.min(1, elapsed / totalDuration);
            if (!reducedMotion) {
                // If a fold/resize or zoom reveals more canvas mid-flight,
                // retarget the remaining travel without jumping the body or
                // delaying the queued input. Never reverse when it shrinks.
                travelDistance = Math.max(travelDistance, arrowExitDistance(route, this.renderer.getVisibleGridBounds()));
                const eased = arrowDepartureEase(progress);
                const fraction = previousEase >= 1 ? 1 : (eased - previousEase) / (1 - previousEase);
                travelled += (travelDistance - travelled) * Math.max(0, Math.min(1, fraction));
                previousEase = eased;
            }
            path._visualGeometry = sampleArrowMotion(route, reducedMotion ? 0 : travelled);
            if (reducedMotion) path._visualGeometry.alpha = 1 - progress;
            this.renderer.drawGrid(this.grid);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                path._visualGeometry = null;
                this._animationRestore = null;
                this.grid.finalizeRemoval(path);
                this.isAnimating = false;
                updateRuneHud(this.grid);
                this._updateGameFeedback();
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
        if (!this._active || this.isAnimating || !this.grid.paths.includes(path) || path.isRemoved()) return;
        this._clearBlockedFeedback();
        if (this.grid.hasRuneOrder() && !this.grid.isRuneEligible(path)) {
            // The visible code is a puzzle rule, never a paid mistake.
            this._runeNotice = 'runes.wrong_rune';
            this._updateGameFeedback();
            tapLight();
            return;
        }
        this._runeNotice = null;
        const blocker = this.grid.getFirstBlocker(path);
        if (this.zenMode) {
            // Zen still acknowledges a blocked exit, without charging a
            // life, breaking a streak, or imposing a failed attempt.
            const epoch = this._levelEpoch;
            tapLight();
            path._flashColor = this.renderer.errorColor;
            this._showBlockedFeedback(path, blocker, epoch);
            const flashToken = this._blockedFeedbackToken;
            this.renderer.drawGrid(this.grid);
            setTimeout(() => {
                if (epoch !== this._levelEpoch || !this._active || flashToken !== this._blockedFeedbackToken) return;
                path._flashColor = null;
            }, 180);
            return;
        }
        const epoch = this._levelEpoch;
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

        // Crack effect
        const wrongHead = path.getHead();
        this.renderer.showCrackEffect(
            this.renderer.gridOffsetX + (wrongHead.x + 0.5) * this.renderer.cellSize,
            this.renderer.gridOffsetY + (wrongHead.y + 0.5) * this.renderer.cellSize
        );

        // A short blocked-exit response, with a stationary color cue when
        // Reduce Motion is enabled.
        this.isAnimating = true;
        const origState = path.state;
        path.state = 'removing';
        const { dx, dy } = getDirectionVector(path.direction);
        const idleGeometry = sampleArrowMotion(createArrowRoute(path.cells, path.direction));

        this._animationRestore = () => {
            path._visualGeometry = null;
            path._flashColor = null;
            path.state = origState;
            this.renderer.shakeX = this.renderer.shakeY = 0;
            this.grid.updateRemovableStates();
        };
        const ph1 = 60;
        const ph2 = 60;
        const ph3 = 80;
        const ph4 = 120;
        const totalDuration = this.renderer.reducedMotion ? 120 : ph1 + ph2 + ph3 + ph4;
        const lunge = 0.4;
        const startTime = performance.now();
        const shakeStart = ph1;
        const shakeDuration = 100;

        const animate = (time) => {
            if (epoch !== this._levelEpoch || !this._active) return;
            const elapsed = time - startTime;

            let shift;

            if (elapsed < ph1) {
                // Phase 1: forward lunge
                const p = elapsed / ph1;
                shift = lunge * (1 - Math.pow(1 - p, 2));
            } else if (elapsed < ph1 + ph2) {
                // Phase 2: hold at lunge, flash red
                shift = lunge;
                path._flashColor = this.renderer.errorColor;
            } else if (elapsed < ph1 + ph2 + ph3) {
                // Phase 3: shake oscillation, clear flash
                path._flashColor = this.renderer.errorColor;
                const p = (elapsed - ph1 - ph2) / ph3;
                shift = lunge + Math.sin(p * Math.PI * 6) * 0.12;
            } else {
                // Phase 4: elastic bounce back using cubic ease
                path._flashColor = this.renderer.errorColor;
                const p = (elapsed - ph1 - ph2 - ph3) / ph4;
                const eased = 1 - Math.pow(1 - Math.min(p, 1), 3);
                shift = lunge * (1 - eased);
            }

            if (this.renderer.reducedMotion) { shift = 0; path._flashColor = this.renderer.errorColor; }

            // Screen shake: sin/cos oscillation for 100ms starting at phase 2
            const shakeElapsed = (time - startTime) - shakeStart;
            if (!this.renderer.reducedMotion && shakeElapsed >= 0 && shakeElapsed < shakeDuration) {
                const sp = shakeElapsed / shakeDuration;
                this.renderer.shakeX = Math.sin(sp * Math.PI * 8) * 2 * (1 - sp);
                this.renderer.shakeY = Math.cos(sp * Math.PI * 8) * 2 * (1 - sp);
            } else {
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
            }

            path._visualGeometry = { ...idleGeometry,
                points: idleGeometry.points.map(point => ({ x: point.x + dx * shift, y: point.y + dy * shift })),
                tip: { x: idleGeometry.tip.x + dx * shift, y: idleGeometry.tip.y + dy * shift },
            };

            this.renderer.drawGrid(this.grid);

            if (elapsed < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                this._animationRestore = null;
                // Restore everything
                path._visualGeometry = null;
                path._flashColor = null;
                path.state = origState;
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
                this.grid.updateRemovableStates();
                this.isAnimating = false;
                this._showBlockedFeedback(path, blocker, epoch);
                this.renderer.drawGrid(this.grid);
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
        if (!this._active || this._outcome) return;
        this._outcome = 'complete';
        this._active = false;
        if (this._resetInput) this._resetInput();
        this._stopTimer();
        // Celebratory triple-thump — feels like a "victory" cue on iOS Taptic Engine.
        tapHeavy();
        setTimeout(() => tapHeavy(), 80);
        setTimeout(() => tapMedium(), 180);
        const elapsedTime = Math.round((this.timeLimit - this.timeRemaining) * 1000);

        // Time bonus: 2 points per second remaining — skipped in moves mode
        // because the timer is frozen and would award a misleading full bonus.
        const timeBonus = this.zenMode || this.moveLimit > 0 ? 0 : Math.round(this.timeRemaining * 2);
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

        storage.completeLevel(this.currentLevel.id, this.currentChapter.id);

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
        if (this.renderer.reducedMotion) return;
        const head = path.getHead();
        const cx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const cy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;

        let color, fontSize;
        if (this.combo >= 6) { color = BOARD_VISUALS.accent; fontSize = 20; }
        else { color = this.renderer.theme.arrowIdle; fontSize = 15; }

        const text = this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`;
        this._showFloatingText(text, cx, cy, color, fontSize);
    }

    _showFloatingText(text, x, y, color, fontSize) {
        if (this.renderer.reducedMotion) return;
        const epoch = this._levelEpoch;
        const start = performance.now();
        const duration = 1000;
        const draw = () => {
            if (epoch !== this._levelEpoch) return;
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
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 2;
            ctx.fillText(text, sx, sy);
            ctx.restore();

            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    }

    _doScreenShake(intensity, duration) {
        if (this.renderer.reducedMotion) return;
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
        const epoch = this._levelEpoch;
        if (this.renderer.reducedMotion) {
            if (callback) callback();
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const particles = [];
        const colors = [BOARD_VISUALS.ink, BOARD_VISUALS.accent, '#d3b36e'];
        const shapes = ['circle', 'diamond'];

        const cx = rect.width / 2;
        const cy = rect.height / 2;

        // A small finish cue leaves the completed silhouette easy to read.
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            particles.push({
                x: cx + (Math.random() - 0.5) * 60,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.25,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                delay: Math.random() * 100  // staggered 0-100ms
            });
        }

        const startTime = performance.now();
        const duration = 800;
        const ctx = this.renderer.ctx;
        const dpr = window.devicePixelRatio || 1;
        let lastFrame = startTime;

        const animate = (time) => {
            if (epoch !== this._levelEpoch) return;
            // RAF timestamps describe the frame start, which can precede
            // performance.now() when this callback was requested mid-frame.
            // A negative elapsed value creates an invalid shockwave radius.
            const elapsed = Math.max(0, time - startTime);
            if (elapsed >= duration) {
                if (callback) callback();
                return;
            }

            const progress = elapsed / duration;
            const frameStep = Math.min(3, Math.max(0, time - lastFrame) / (1000 / 60));
            lastFrame = time;

            // Draw current grid state as background with subtle zoom-out
            this.renderer.drawGrid(this.grid);

            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Shockwave ring expanding from center
            const shockProgress = Math.min(elapsed / 400, 1);
            if (shockProgress < 1) {
                const shockRadius = shockProgress * Math.min(rect.width, rect.height) * 0.25;
                const shockAlpha = (1 - shockProgress) * 0.12;
                ctx.strokeStyle = `rgba(196,104,61,${shockAlpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw particles
            for (const p of particles) {
                const particleElapsed = elapsed - p.delay;
                if (particleElapsed <= 0) continue;

                p.x += p.vx * frameStep;
                p.y += p.vy * frameStep;
                p.vy += 0.18 * frameStep;
                p.vx *= Math.pow(0.995, frameStep);
                p.rotation += p.rotSpeed * frameStep;
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
        if (!this._active || this.isAnimating) return false;
        this._clearBlockedFeedback();
        if (this.undoCharges <= 0) return false;
        const last = this._moveHistory.pop();
        if (!last) return false;

        const path = last.pathRef;
        // Restore the snapshot and discard any transient visual geometry.
        for (let i = 0; i < path.cells.length; i++) {
            path.cells[i].x = last.snakeCells[i].x;
            path.cells[i].y = last.snakeCells[i].y;
        }
        path._visualGeometry = null;
        path.state = last.prevState;
        this.score = last.score;
        this.combo = last.combo;
        this.maxCombo = last.maxCombo;
        this.moves = last.moves;
        this._consecutiveWrongs = last.consecutiveWrongs;
        if (!this.grid.hasRuneOrder()) this.undoCharges--;
        this.hintedPath = null;
        this._runeNotice = null;

        this.grid.updateRemovableStates();
        updateRuneHud(this.grid);
        this._updateGameFeedback();
        this._updateScoreDisplay();
        this._updateUndoButton();
        this._updatePowerupButtons();
        this.renderer.drawGrid(this.grid);
        return true;
    }

    _updateUndoButton() {
        const btn = document.getElementById('btn-undo');
        if (!btn) return;
        const countEl = document.getElementById('undo-count');
        if (countEl) countEl.textContent = this.undoCharges === Infinity ? '∞' : this.undoCharges;
        if (this.grid?.hasRuneOrder()) btn.setAttribute?.('title', t('runes.free_undo'));
        else btn.setAttribute?.('title', t('game.undo'));
        btn.disabled = this.undoCharges <= 0 || this._moveHistory.length === 0;
        btn.style.opacity = btn.disabled ? '0.35' : '1';
    }

    useHint() {
        if (!this._active || this.isAnimating || !this.grid || this.hintedPath) return;

        const hintPath = this.hintManager.findHintArrow(this.grid);
        if (!hintPath) {
            if (this.grid.hasRuneOrder()) {
                this._runeNotice = this.hintManager.lastStatus === 'unsolvable' ? 'runes.hint_undo' : 'runes.hint_unavailable';
                this._updateGameFeedback();
            }
            return;
        }

        // Use this level's free hint before spending an earned inventory hint.
        const invPowerups = storage.getPowerups();
        if (this.hintManager.hasFreeHint()) {
            this.hintManager.useFreeHint();
        } else if (invPowerups.hint > 0) {
            storage.usePowerup('hint');
        } else {
            return;
        }

        this._runeNotice = null;
        this.usedHint = true;
        this.hintedPath = hintPath;
        this._clearBlockedFeedback();
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
        if (!this._active || !this.grid || this.timeLimit <= 0 || this.zenMode || this.moveLimit > 0) return;
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
        const availableHints = p.hint + Number(!!this.currentLevel && this.hintManager.hasFreeHint());
        if (hintCount) hintCount.textContent = availableHints;
        if (freezeCount) freezeCount.textContent = p.freeze;
        if (hintBtn) {
            const canUseHint = availableHints > 0;
            hintBtn.disabled = !canUseHint || this.hintedPath !== null;
            hintBtn.style.opacity = hintBtn.disabled ? '0.4' : '1';
        }
        if (freezeBtn) {
            const canUseFreeze = p.freeze > 0 && this.timeLimit > 0 && !this.zenMode && this.moveLimit === 0;
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
                if (this.hintedPath && !this.hintedPath.isRemoved()) this.renderer.drawHintHighlight(this.hintedPath);
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

    zoomBoard(factor) {
        if (!this._active || !this.grid) return;
        const rect = this.canvas.getBoundingClientRect();
        this.renderer.setZoom(this.renderer.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.renderer.drawGrid(this.grid);
    }

    handleResize() {
        if (this.grid && this.currentLevel) {
            this._resetInput?.();
            this.renderer.resize(this.currentLevel.gridWidth, this.currentLevel.gridHeight, { preserveView: true });
            this.renderer.drawGrid(this.grid);
        }
    }
}
