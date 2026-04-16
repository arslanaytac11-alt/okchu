# Ok Bulmacasi Gameplay Overhaul - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the game feel with countdown timer, denser grids, themed atmospheres with particles/silhouettes, combo-scaled removal effects, and updated star/progression system.

**Architecture:** Five independent systems layered onto existing codebase: (1) countdown timer in game.js replacing elapsed timer, (2) particle engine as new module consumed by renderer, (3) theme atmosphere module with silhouettes/particle configs/arrow styles, (4) combo-scaled effects enhancing existing removal/wrong-move animations, (5) updated star criteria and progression gating. Level regeneration with higher density runs last.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, Web Audio API. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-16-gameplay-overhaul-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `js/arrow.js` | Modify | Add `armor`, `frozenUntil`, `mirrorPairId`, `chainGroupId` fields |
| `js/game.js` | Modify | Countdown timer, new mechanics (armor/freeze/chain/mirror), combo-scaled effects, star formula |
| `js/renderer.js` | Modify | Vignette, crack effect, trail, combo particles, arrow style variations, grid style |
| `js/particles.js` | Create | Reusable particle system (ambient + burst + celebration) |
| `js/themes.js` | Create | Per-chapter atmosphere config (silhouettes, particle presets, arrow styles) |
| `js/sound.js` | Modify | Heartbeat, deeper wrong bass, pitch-scaled combo, mega combo sound |
| `js/screens.js` | Modify | Star display on chapter cards, star-based unlock gating |
| `js/main.js` | Modify | Time-up overlay, animated star reveal on completion |
| `js/storage.js` | Modify | `getTotalStars()`, `getChapterStars()` helpers |
| `index.html` | Modify | Time-up overlay HTML, updated timer display |
| `css/style.css` | Modify | Timer countdown styles, vignette, star animations |
| `generate-levels.mjs` | Modify | New density values, grid sizes, mechanic assignment |
| `js/data/levels/*.js` | Regenerate | All 50 levels with new parameters |

---

### Task 1: ArrowPath — Add Mechanic Fields

**Files:**
- Modify: `js/arrow.js:27-35`

- [ ] **Step 1: Add new fields to ArrowPath constructor**

In `js/arrow.js`, add mechanic fields after `this.colorIndex`:

```javascript
export class ArrowPath {
    constructor(cells, direction, colorIndex) {
        this.cells = cells.map(c => ({ x: c[0], y: c[1] }));
        this.direction = direction;
        this.state = ArrowState.IDLE;
        this.animProgress = 0;
        this.colorIndex = colorIndex || 0;

        // Mechanic fields (set by level loader based on chapter)
        this.armor = 0;           // >0 means armored, decrements on tap
        this.frozenUntil = 0;     // timestamp when freeze expires
        this.mirrorPairId = null;  // string id linking mirror pairs
        this.chainGroupId = null;  // string id linking chain groups
    }
```

- [ ] **Step 2: Verify no imports break**

Run: Open `index.html` in browser, confirm console has no errors.

- [ ] **Step 3: Commit**

```bash
git add js/arrow.js
git commit -m "feat: add mechanic fields to ArrowPath (armor, freeze, mirror, chain)"
```

---

### Task 2: Countdown Timer System

**Files:**
- Modify: `js/game.js:30-101`
- Modify: `index.html:51`
- Modify: `css/style.css` (timer styles)

- [ ] **Step 1: Add time config constant to game.js**

Add after the imports (line 10) in `js/game.js`:

```javascript
const TIME_CONFIG = {
    // [baseSec, perPathSec] indexed by chapter bracket
    1: [60, 3.0], 2: [60, 3.0],
    3: [45, 2.5], 4: [45, 2.5],
    5: [35, 2.0], 6: [35, 2.0],
    7: [25, 1.5], 8: [25, 1.5],
    9: [20, 1.0], 10: [20, 1.0],
};

const TIME_BONUS_CORRECT = 3;    // seconds added on correct move
const TIME_PENALTY_WRONG = 5;    // seconds removed on wrong move
const TIME_BONUS_COMBO = 1;      // extra seconds when combo >= 3
```

- [ ] **Step 2: Add countdown fields to constructor**

In `js/game.js` constructor (after line 39 `this.usedHint = false;`), add:

```javascript
        this.timeLimit = 0;       // total seconds for this level
        this.timeRemaining = 0;   // seconds left (float)
        this.onTimeUp = null;     // callback when time expires
```

- [ ] **Step 3: Replace elapsed timer with countdown in startLevel**

Replace lines 70-72 in `startLevel()`:

```javascript
        // Old:
        // this.startTime = Date.now();
        // this.elapsedTime = 0;
        // this._startTimer();

        // Countdown timer
        const chapterId = chapterData.id;
        const [baseSec, perPathSec] = TIME_CONFIG[chapterId] || [60, 3.0];
        this.timeLimit = baseSec + Math.round(this.totalPaths * perPathSec);
        this.timeRemaining = this.timeLimit;
        this._startCountdown();
```

- [ ] **Step 4: Replace _startTimer and _updateTimerDisplay with countdown versions**

Replace `_startTimer()` (lines 79-85), `_stopTimer()` (lines 87-92), and `_updateTimerDisplay()` (lines 94-101) with:

```javascript
    _startCountdown() {
        this._stopTimer();
        this._lastTick = Date.now();
        this._timerInterval = setInterval(() => {
            const now = Date.now();
            const dt = (now - this._lastTick) / 1000;
            this._lastTick = now;
            this.timeRemaining = Math.max(0, this.timeRemaining - dt);
            this._updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this._handleTimeUp();
            }
        }, 100); // 100ms for smooth countdown
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

        // Urgency classes
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
```

- [ ] **Step 5: Wire time bonus/penalty into handleTap flow**

In `removePathWithAnimation()` (around line 240, after combo update), add:

```javascript
        // Time bonus
        this.addTime(TIME_BONUS_CORRECT);
        if (this.combo >= 3) {
            this.addTime(TIME_BONUS_COMBO);
        }
```

In `handleWrongMove()` (around line 315, at the start), add:

```javascript
        this.removeTime(TIME_PENALTY_WRONG);
```

- [ ] **Step 6: Update handleLevelComplete to use remaining time**

In `handleLevelComplete()` (around line 420), replace the time bonus calculation. Find the line calculating `timeBonus` and replace with:

```javascript
        const timeBonus = Math.round(this.timeRemaining * 2); // 2 points per second remaining
```

Also add `timeRemaining` to the stats object passed to the callback:

```javascript
        const stats = {
            score: this.score,
            stars,
            moves: this.moves,
            wrongMoves: this.wrongMoves,
            time: Math.round((this.timeLimit - this.timeRemaining) * 1000),
            timeRemaining: Math.round(this.timeRemaining),
            maxCombo: this.maxCombo,
            usedHint: this.usedHint,
        };
```

- [ ] **Step 7: Add timer CSS styles**

Append to `css/style.css`:

```css
/* Countdown timer urgency */
.timer-warning {
    color: #c04030 !important;
    animation: timerPulse 500ms ease-in-out infinite;
}

.timer-critical {
    color: #ff1a1a !important;
    font-weight: bold;
    animation: timerPulse 300ms ease-in-out infinite;
    font-size: 1.1em;
}

@keyframes timerPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
```

- [ ] **Step 8: Add time-up overlay to index.html**

After the `overlay-no-lives` div (line 75), add:

```html
        <!-- Time Up Overlay -->
        <div id="overlay-time-up" class="overlay hidden">
            <div class="overlay-content">
                <h2>Sure Doldu!</h2>
                <p class="time-up-message">Zamani yetistiremdin</p>
                <button id="btn-retry" class="btn btn-primary">Tekrar Dene</button>
                <button id="btn-time-up-back" class="btn btn-secondary">Bolumler</button>
            </div>
        </div>
```

- [ ] **Step 9: Wire time-up overlay in main.js**

Add after `game.onLivesChanged` handler (line 85) in `js/main.js`:

```javascript
// When time runs out
game.onTimeUp = () => {
    game.livesManager.renderLives(livesDisplay);
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }
    const overlay = document.getElementById('overlay-time-up');
    overlay.classList.remove('hidden');

    const retryBtn = document.getElementById('btn-retry');
    const backBtn = document.getElementById('btn-time-up-back');

    const cleanup = () => {
        overlay.classList.add('hidden');
        retryBtn.removeEventListener('click', retryHandler);
        backBtn.removeEventListener('click', backHandler);
    };

    const retryHandler = () => {
        cleanup();
        game.startLevel(game.currentLevel, game.currentChapter);
    };

    const backHandler = () => {
        cleanup();
        screenManager.showChapters();
    };

    retryBtn.addEventListener('click', retryHandler);
    backBtn.addEventListener('click', backHandler);
};
```

- [ ] **Step 10: Test countdown timer**

Open game in browser, start Egypt level 1. Verify:
- Timer counts down from ~150s (60 + 30×3)
- Correct move adds ~3s
- Wrong move subtracts ~5s
- Timer turns red/pulses when low
- Time running out shows overlay and costs a life

- [ ] **Step 11: Commit**

```bash
git add js/game.js js/main.js index.html css/style.css
git commit -m "feat: add countdown timer with bonus/penalty and urgency effects"
```

---

### Task 3: Particle System Engine

**Files:**
- Create: `js/particles.js`

- [ ] **Step 1: Create particle system module**

Create `js/particles.js`:

```javascript
// js/particles.js
// Reusable particle system for ambient, burst, and celebration effects

export class Particle {
    constructor(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.gravity = gravity || 0;
        this.rotation = rotation || 0;
        this.rotationSpeed = rotationSpeed || 0;
        this.shape = shape || 'circle'; // circle, square, leaf, flake, spark
        this.alpha = 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    get dead() {
        return this.life <= 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this._pool = []; // object pool to avoid GC
    }

    _getParticle(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape) {
        let p = this._pool.pop();
        if (p) {
            p.x = x; p.y = y; p.vx = vx; p.vy = vy;
            p.life = life; p.maxLife = life; p.size = size;
            p.color = color; p.gravity = gravity || 0;
            p.rotation = rotation || 0;
            p.rotationSpeed = rotationSpeed || 0;
            p.shape = shape || 'circle'; p.alpha = 1;
            return p;
        }
        return new Particle(x, y, vx, vy, life, size, color, gravity, rotation, rotationSpeed, shape);
    }

    // Emit a burst of particles from a point
    burst(x, y, count, config) {
        const {
            speed = 100, spread = Math.PI * 2, angle = 0,
            life = 0.6, lifeVar = 0.2,
            size = 3, sizeVar = 1,
            color = '#ffffff', colors = null,
            gravity = 80, rotationSpeed = 2,
            shape = 'circle',
        } = config;

        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * spread;
            const s = speed * (0.5 + Math.random() * 0.5);
            const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;
            const p = this._getParticle(
                x, y,
                Math.cos(a) * s, Math.sin(a) * s,
                life + (Math.random() - 0.5) * lifeVar,
                size + (Math.random() - 0.5) * sizeVar,
                c, gravity,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * rotationSpeed,
                shape
            );
            this.particles.push(p);
        }
    }

    // Spawn a single ambient particle (for continuous effects)
    spawn(x, y, vx, vy, config) {
        const {
            life = 3, size = 2, color = '#ffffff',
            gravity = 0, rotationSpeed = 0.5, shape = 'circle',
        } = config;
        const p = this._getParticle(
            x, y, vx, vy, life, size, color,
            gravity, Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * rotationSpeed, shape
        );
        this.particles.push(p);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].dead) {
                this._pool.push(this.particles[i]);
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'square':
                    ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
                    break;
                case 'leaf':
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'flake':
                    // Simple 6-point snowflake
                    ctx.lineWidth = p.size * 0.3;
                    ctx.strokeStyle = p.color;
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
                        ctx.stroke();
                    }
                    break;
                case 'spark':
                    // Elongated spark
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size * 2, p.size * 0.4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'petal':
                    // Teardrop petal shape
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.quadraticCurveTo(p.size, 0, 0, p.size);
                    ctx.quadraticCurveTo(-p.size, 0, 0, -p.size);
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }
    }

    clear() {
        this._pool.push(...this.particles);
        this.particles.length = 0;
    }

    get count() {
        return this.particles.length;
    }
}
```

- [ ] **Step 2: Verify module loads**

Add temporary import in `js/game.js`:
```javascript
import { ParticleSystem } from './particles.js';
```
Open browser, confirm no console errors. Keep the import (it will be used in Task 5).

- [ ] **Step 3: Commit**

```bash
git add js/particles.js js/game.js
git commit -m "feat: add pooled particle system engine with multiple shapes"
```

---

### Task 4: Theme Atmosphere Module

**Files:**
- Create: `js/themes.js`

- [ ] **Step 1: Create themes module with particle configs and silhouette draw functions**

Create `js/themes.js`:

```javascript
// js/themes.js
// Per-chapter atmosphere: ambient particle configs and background silhouettes

// Ambient particle presets per chapter
export const AMBIENT_PARTICLES = {
    1: { // Egypt - sand
        shape: 'circle', color: '#c9a96e', count: 15,
        spawnArea: 'top', vx: 15, vy: 8, life: 5, size: 1.5, gravity: 3,
    },
    2: { // Greek - olive leaves
        shape: 'leaf', color: '#7a9a4a', count: 12,
        spawnArea: 'top', vx: 5, vy: 12, life: 6, size: 2.5, gravity: 2,
    },
    3: { // Rome - sparks
        shape: 'spark', color: '#d4733a', count: 10,
        spawnArea: 'bottom', vx: 8, vy: -30, life: 2, size: 2, gravity: -5,
    },
    4: { // Viking - snow
        shape: 'flake', color: '#d0e8f0', count: 18,
        spawnArea: 'top', vx: 10, vy: 15, life: 7, size: 2, gravity: 1,
    },
    5: { // Ottoman - petals
        shape: 'petal', color: '#c44060', count: 12,
        spawnArea: 'top', vx: 6, vy: 10, life: 6, size: 2.5, gravity: 2,
    },
    6: { // China - cherry blossom
        shape: 'petal', color: '#e8a0b0', count: 15,
        spawnArea: 'top', vx: 8, vy: 8, life: 7, size: 2, gravity: 1.5,
    },
    7: { // Maya - fireflies
        shape: 'circle', color: '#c0d040', count: 14,
        spawnArea: 'random', vx: 12, vy: 12, life: 3, size: 2, gravity: 0,
        pulse: true, // alpha oscillates
    },
    8: { // India - gold dust
        shape: 'circle', color: '#d4a830', count: 16,
        spawnArea: 'bottom', vx: 5, vy: -8, life: 4, size: 1.5, gravity: -2,
    },
    9: { // Medieval - fog
        shape: 'circle', color: '#b0b8c0', count: 10,
        spawnArea: 'left', vx: 12, vy: 2, life: 8, size: 8, gravity: 0,
    },
    10: { // Final - mixed (cycles through all)
        mixed: true, cycle: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
};

// Silhouette draw functions - called with (ctx, canvasWidth, canvasHeight, alpha)
export const SILHOUETTES = {
    1: drawPyramids,
    2: drawColumns,
    3: drawArches,
    4: drawShip,
    5: drawMosque,
    6: drawPagoda,
    7: drawTemple,
    8: drawPalace,
    9: drawCastle,
    10: drawPanorama,
};

// Arrow style config per chapter bracket
export const ARROW_STYLES = {
    // chapters 1-3: clean solid
    simple: { lineWidth: 0.09, dash: null, headStyle: 'simple', shimmer: false },
    // chapters 4-6: dashed pattern
    patterned: { lineWidth: 0.09, dash: [4, 3], headStyle: 'simple', shimmer: false },
    // chapters 7-9: ornate heads
    ornate: { lineWidth: 0.09, dash: null, headStyle: 'forked', shimmer: false },
    // chapter 10: golden shimmer
    golden: { lineWidth: 0.10, dash: null, headStyle: 'forked', shimmer: true },
};

export function getArrowStyle(chapterId) {
    if (chapterId <= 3) return ARROW_STYLES.simple;
    if (chapterId <= 6) return ARROW_STYLES.patterned;
    if (chapterId <= 9) return ARROW_STYLES.ornate;
    return ARROW_STYLES.golden;
}

// Grid style config
export function getGridStyle(chapterId) {
    return {
        dotSize: 2.5,
        landmarkInterval: 4,
        landmarkDotSize: 3.5,
        lineAlpha: 0.04,
    };
}

// --- Silhouette Drawing Functions ---

function drawPyramids(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(160, 130, 80, ${alpha})`;
    // Left pyramid
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h);
    ctx.lineTo(w * 0.15, h * 0.82);
    ctx.lineTo(w * 0.25, h);
    ctx.fill();
    // Center pyramid (larger)
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.lineTo(w * 0.35, h * 0.72);
    ctx.lineTo(w * 0.52, h);
    ctx.fill();
    // Small right pyramid
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h);
    ctx.lineTo(w * 0.62, h * 0.86);
    ctx.lineTo(w * 0.69, h);
    ctx.fill();
    ctx.restore();
}

function drawColumns(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(140, 130, 120, ${alpha})`;
    const colW = w * 0.025;
    const positions = [0.08, 0.16, 0.84, 0.92];
    for (const xp of positions) {
        const x = w * xp;
        ctx.fillRect(x - colW / 2, h * 0.65, colW, h * 0.35);
        // Capital
        ctx.fillRect(x - colW * 0.7, h * 0.64, colW * 1.4, h * 0.02);
    }
    // Architrave connecting columns
    ctx.fillRect(w * 0.065, h * 0.63, w * 0.115, h * 0.015);
    ctx.fillRect(w * 0.825, h * 0.63, w * 0.115, h * 0.015);
    ctx.restore();
}

function drawArches(ctx, w, h, alpha) {
    ctx.save();
    ctx.strokeStyle = `rgba(150, 120, 90, ${alpha})`;
    ctx.lineWidth = 3;
    const archW = w * 0.12;
    for (const xp of [0.2, 0.5, 0.8]) {
        const cx = w * xp;
        ctx.beginPath();
        ctx.arc(cx, h * 0.88, archW, Math.PI, 0);
        ctx.stroke();
        // Pillars
        ctx.fillStyle = `rgba(150, 120, 90, ${alpha})`;
        ctx.fillRect(cx - archW - 2, h * 0.88, 4, h * 0.12);
        ctx.fillRect(cx + archW - 2, h * 0.88, 4, h * 0.12);
    }
    ctx.restore();
}

function drawShip(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 80, 60, ${alpha})`;
    // Hull
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.92);
    ctx.quadraticCurveTo(w * 0.2, h * 0.85, w * 0.4, h * 0.88);
    ctx.lineTo(w * 0.05, h * 0.95);
    ctx.fill();
    // Mast
    ctx.fillRect(w * 0.22, h * 0.72, 2, h * 0.16);
    // Sail
    ctx.beginPath();
    ctx.moveTo(w * 0.225, h * 0.73);
    ctx.quadraticCurveTo(w * 0.30, h * 0.78, w * 0.225, h * 0.85);
    ctx.fill();
    ctx.restore();
}

function drawMosque(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(120, 90, 80, ${alpha})`;
    // Main dome
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.88, w * 0.12, Math.PI, 0);
    ctx.fillRect(w * 0.38, h * 0.88, w * 0.24, h * 0.12);
    ctx.fill();
    // Minarets
    const minW = 3;
    ctx.fillRect(w * 0.32 - minW / 2, h * 0.7, minW, h * 0.3);
    ctx.fillRect(w * 0.68 - minW / 2, h * 0.7, minW, h * 0.3);
    // Minaret tips
    ctx.beginPath();
    ctx.arc(w * 0.32, h * 0.7, 4, 0, Math.PI * 2);
    ctx.arc(w * 0.68, h * 0.7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPagoda(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(120, 100, 80, ${alpha})`;
    const cx = w * 0.85;
    const levels = 4;
    for (let i = 0; i < levels; i++) {
        const y = h * (0.75 + i * 0.06);
        const halfW = (levels - i) * w * 0.025;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, y);
        ctx.lineTo(cx, y - h * 0.03);
        ctx.lineTo(cx + halfW, y);
        ctx.fill();
        ctx.fillRect(cx - halfW * 0.6, y, halfW * 1.2, h * 0.03);
    }
    ctx.restore();
}

function drawTemple(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 110, 80, ${alpha})`;
    // Stepped pyramid
    const steps = 5;
    for (let i = 0; i < steps; i++) {
        const y = h * (0.82 + i * 0.035);
        const halfW = (steps - i) * w * 0.04;
        ctx.fillRect(w * 0.15 - halfW, y, halfW * 2, h * 0.035);
    }
    // Top temple
    ctx.fillRect(w * 0.13, h * 0.79, w * 0.04, h * 0.035);
    ctx.restore();
}

function drawPalace(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(140, 110, 70, ${alpha})`;
    // Main dome
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.85, w * 0.08, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.42, h * 0.85, w * 0.16, h * 0.15);
    // Side domes
    ctx.beginPath();
    ctx.arc(w * 0.35, h * 0.88, w * 0.04, Math.PI, 0);
    ctx.arc(w * 0.65, h * 0.88, w * 0.04, Math.PI, 0);
    ctx.fill();
    // Spire
    ctx.fillRect(w * 0.498, h * 0.76, 3, h * 0.09);
    ctx.restore();
}

function drawCastle(ctx, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(100, 100, 110, ${alpha})`;
    // Main wall
    ctx.fillRect(w * 0.65, h * 0.82, w * 0.25, h * 0.18);
    // Towers
    ctx.fillRect(w * 0.63, h * 0.74, w * 0.05, h * 0.26);
    ctx.fillRect(w * 0.87, h * 0.74, w * 0.05, h * 0.26);
    // Battlements
    const bw = w * 0.015;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(w * 0.67 + i * w * 0.04, h * 0.80, bw, h * 0.025);
    }
    ctx.restore();
}

function drawPanorama(ctx, w, h, alpha) {
    // Final chapter: combine elements from multiple civilizations
    drawPyramids(ctx, w, h, alpha * 0.5);
    drawMosque(ctx, w, h, alpha * 0.5);
    drawCastle(ctx, w, h, alpha * 0.5);
}
```

- [ ] **Step 2: Commit**

```bash
git add js/themes.js
git commit -m "feat: add theme atmosphere module with silhouettes and particle configs"
```

---

### Task 5: Integrate Ambient Particles and Silhouettes into Renderer

**Files:**
- Modify: `js/renderer.js:5-6` (imports)
- Modify: `js/renderer.js:8-36` (constructor)
- Modify: `js/renderer.js:84-96` (clear method)
- Modify: `js/renderer.js:98-123` (drawGrid method)
- Modify: `js/renderer.js:125-139` (drawGridDots)
- Modify: `js/renderer.js:418-424` (setTheme/tick)

- [ ] **Step 1: Add imports to renderer.js**

Replace the import line at top of `js/renderer.js` (line 5):

```javascript
import { ArrowState, getDirectionVector } from './arrow.js';
import { ParticleSystem } from './particles.js';
import { AMBIENT_PARTICLES, SILHOUETTES, getArrowStyle, getGridStyle } from './themes.js';
```

- [ ] **Step 2: Add particle system and chapter tracking to constructor**

After `this.touchFeedback = null;` (line 22) in the constructor, add:

```javascript
        this.ambientParticles = new ParticleSystem();
        this.burstParticles = new ParticleSystem();
        this.chapterId = 1;
        this.arrowStyle = getArrowStyle(1);
        this.gridStyle = getGridStyle(1);
        this._ambientTimer = 0;
        this._lastTime = 0;
```

- [ ] **Step 3: Update setTheme to accept chapterId**

Replace `setTheme` method (line 418-420):

```javascript
    setTheme(theme, chapterId) {
        Object.assign(this.theme, theme);
        this.chapterId = chapterId || 1;
        this.arrowStyle = getArrowStyle(this.chapterId);
        this.gridStyle = getGridStyle(this.chapterId);
        this.ambientParticles.clear();
    }
```

- [ ] **Step 4: Update tick to spawn ambient particles**

Replace `tick` method (line 422-424):

```javascript
    tick(time) {
        const dt = this._lastTime ? (time - this._lastTime) / 1000 : 0.016;
        this._lastTime = time;
        this.animTime = time;

        // Update particles
        this.ambientParticles.update(dt);
        this.burstParticles.update(dt);

        // Spawn ambient particles
        this._ambientTimer -= dt;
        if (this._ambientTimer <= 0) {
            this._spawnAmbientParticle();
            this._ambientTimer = 0.3 + Math.random() * 0.4;
        }
    }

    _spawnAmbientParticle() {
        let config = AMBIENT_PARTICLES[this.chapterId];
        if (!config) return;

        // Final chapter cycles through all
        if (config.mixed) {
            const idx = config.cycle[Math.floor(Math.random() * config.cycle.length)];
            config = AMBIENT_PARTICLES[idx];
        }

        if (this.ambientParticles.count >= (config.count || 15)) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        let x, y;

        switch (config.spawnArea) {
            case 'top':
                x = Math.random() * w;
                y = -10;
                break;
            case 'bottom':
                x = Math.random() * w;
                y = h + 10;
                break;
            case 'left':
                x = -10;
                y = Math.random() * h;
                break;
            case 'random':
                x = Math.random() * w;
                y = Math.random() * h;
                break;
            default:
                x = Math.random() * w;
                y = -10;
        }

        const vx = (Math.random() - 0.3) * (config.vx || 10);
        const vy = config.vy || 10;

        this.ambientParticles.spawn(x, y, vx, vy, {
            life: config.life || 4,
            size: config.size || 2,
            color: config.color || '#ffffff',
            gravity: config.gravity || 0,
            rotationSpeed: 1,
            shape: config.shape || 'circle',
        });
    }
```

- [ ] **Step 5: Update clear() to draw silhouettes after background**

Replace the `clear()` method (lines 84-96):

```javascript
    clear() {
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, this.theme.backgroundGradient?.[0] || this.theme.background);
        grad.addColorStop(1, this.theme.backgroundGradient?.[1] || this.theme.background);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Background silhouettes
        const drawSilhouette = SILHOUETTES[this.chapterId];
        if (drawSilhouette) {
            drawSilhouette(ctx, w, h, 0.07);
        }
    }
```

- [ ] **Step 6: Update drawGrid to render particles and vignette**

In the `drawGrid` method, after all paths are drawn (around line 121, before `ctx.restore()`), add:

```javascript
        // Ambient particles (in world space)
        this.ambientParticles.draw(ctx);

        // Burst particles (in world space)
        this.burstParticles.draw(ctx);

        ctx.restore();

        // Vignette overlay for timer urgency (drawn in screen space, outside transform)
        this._drawVignette();
```

And add the vignette method:

```javascript
    _drawVignette() {
        if (!this._vignetteAlpha || this._vignetteAlpha <= 0) return;
        const { ctx, canvas } = this;
        const w = canvas.width, h = canvas.height;
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(200, 30, 30, 0)');
        grad.addColorStop(1, `rgba(200, 30, 30, ${this._vignetteAlpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    setVignetteAlpha(alpha) {
        this._vignetteAlpha = alpha;
    }
```

- [ ] **Step 7: Update drawGridDots for enhanced grid style**

Replace `drawGridDots` method (lines 125-139):

```javascript
    drawGridDots(grid) {
        const ctx = this.ctx;
        const gs = this.gridStyle;
        const dotColor = this.theme.gridDot;

        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                const isLandmark = x % gs.landmarkInterval === 0 && y % gs.landmarkInterval === 0;
                const size = isLandmark ? gs.landmarkDotSize : gs.dotSize;

                ctx.beginPath();
                ctx.arc(px, py, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();
            }
        }

        // Faint grid lines
        ctx.strokeStyle = `rgba(120, 90, 50, ${gs.lineAlpha})`;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= grid.width; x++) {
            const px = this.gridOffsetX + x * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(px, this.gridOffsetY);
            ctx.lineTo(px, this.gridOffsetY + grid.height * this.cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= grid.height; y++) {
            const py = this.gridOffsetY + y * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.gridOffsetX, py);
            ctx.lineTo(this.gridOffsetX + grid.width * this.cellSize, py);
            ctx.stroke();
        }
    }
```

- [ ] **Step 8: Update game.js to pass chapterId to setTheme**

In `js/game.js` `startLevel()` method, find `this.renderer.setTheme(chapterData.theme);` (line 53) and replace with:

```javascript
        this.renderer.setTheme(chapterData.theme, chapterData.id);
```

- [ ] **Step 9: Wire vignette to countdown timer in game.js**

In the `_startCountdown()` method (added in Task 2), inside the interval callback, after updating `timeRemaining`, add:

```javascript
            // Vignette urgency
            const ratio = this.timeRemaining / this.timeLimit;
            if (ratio < 0.15) {
                this.renderer.setVignetteAlpha(0.15 * (1 + 0.3 * Math.sin(Date.now() / 300)));
            } else if (ratio < 0.3) {
                this.renderer.setVignetteAlpha(0.05);
            } else {
                this.renderer.setVignetteAlpha(0);
            }
```

- [ ] **Step 10: Test ambient particles and silhouettes**

Open browser, navigate to each chapter. Verify:
- Egypt: sand particles drift right and down, pyramid silhouettes at bottom
- Viking: snowflakes fall, ship silhouette
- Each chapter has distinct particle type and silhouette
- Grid has bigger dots at landmark intervals with faint lines
- Vignette appears when timer gets low

- [ ] **Step 11: Commit**

```bash
git add js/renderer.js js/game.js
git commit -m "feat: integrate ambient particles, silhouettes, enhanced grid, and vignette"
```

---

### Task 6: Combo-Scaled Removal Effects

**Files:**
- Modify: `js/game.js:238-309` (removePathWithAnimation)
- Modify: `js/game.js:460-492` (_showFloatingScore)
- Modify: `js/game.js:494-605` (playCelebration)
- Modify: `js/renderer.js` (trail effect, crack effect)
- Modify: `js/sound.js` (pitch-scaled combo, heartbeat)

- [ ] **Step 1: Add combo-scaled burst to removePathWithAnimation**

In `js/game.js`, after the scoring update in `removePathWithAnimation()` (after `this._updateScoreDisplay()`), add particle burst:

```javascript
        // Combo-scaled particle burst
        const head = path.getHead();
        const cx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const cy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;
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

        this.renderer.burstParticles.burst(cx, cy, burstCount, {
            speed: burstSpeed,
            spread: Math.PI * 0.8,
            angle: burstAngle,
            life: 0.5 + this.combo * 0.05,
            size: 2 + this.combo * 0.3,
            colors: [comboColors[colorIdx], '#ffffff', this.renderer.theme.arrowIdle],
            gravity: 80,
            shape: this.combo >= 9 ? 'spark' : 'circle',
        });

        // Screen shake for combos
        if (shakeIntensity > 0) {
            this._doScreenShake(shakeIntensity, 80 + this.combo * 10);
        }

        // Mega combo text
        if (this.combo >= 10) {
            this._showFloatingText('MUHTESEM!', cx, cy - 40, '#ffd700', 28);
        }
```

- [ ] **Step 2: Add screen shake helper**

Add to `js/game.js`:

```javascript
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
```

- [ ] **Step 3: Add _showFloatingText method**

Add to `js/game.js` (reusable for both score and combo text):

```javascript
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
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${Math.round(fontSize * scale)}px Georgia`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(text, x, y + offsetY);
            ctx.restore();

            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    }
```

- [ ] **Step 4: Update _showFloatingScore for combo-based styling**

Replace the `_showFloatingScore` method (lines 460-492):

```javascript
    _showFloatingScore(points, path) {
        const head = path.getHead();
        const cx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
        const cy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;

        let color, fontSize;
        if (this.combo >= 10) {
            color = '#ff2020'; fontSize = 28;
        } else if (this.combo >= 6) {
            color = '#ff8c00'; fontSize = 22;
        } else if (this.combo >= 3) {
            color = '#ffd700'; fontSize = 18;
        } else {
            color = '#ffffff'; fontSize = 14;
        }

        this._showFloatingText(`+${points}`, cx, cy, color, fontSize);
    }
```

- [ ] **Step 5: Update sound.js with pitch-scaled combo and heartbeat**

Replace the `combo` case in `js/sound.js` `play()` method (lines 85-96):

```javascript
            case 'combo': {
                // Pitch-scaled rising chime based on combo level
                const comboLevel = Math.min(this._comboLevel || 2, 10);
                const baseFreq = 600 + comboLevel * 60;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.08 + comboLevel * 0.01, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
                // Mega combo: add octave harmonic
                if (comboLevel >= 8) {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2); gain2.connect(ctx.destination);
                    osc2.frequency.value = baseFreq * 2;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(0.05, now);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc2.start(now); osc2.stop(now + 0.2);
                }
                break;
            }
```

Add `setComboLevel` method and `heartbeat` sound to `SoundManager`:

```javascript
    setComboLevel(level) {
        this._comboLevel = level;
    }
```

Add new case inside the `switch(name)` block:

```javascript
            case 'heartbeat': {
                // Deep bass pulse for critical time
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 50;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
                break;
            }
```

- [ ] **Step 6: Update wrong sound to deeper bass**

Replace the `wrong` case in `js/sound.js` (lines 71-83):

```javascript
            case 'wrong': {
                // Deep thud + dissonant buzz
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
                osc1.frequency.value = 80; osc1.type = 'sine';
                osc2.frequency.value = 95; osc2.type = 'sine';
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc1.start(now); osc1.stop(now + 0.35);
                osc2.start(now); osc2.stop(now + 0.35);
                break;
            }
```

- [ ] **Step 7: Wire combo level to sound in game.js**

In `removePathWithAnimation()`, after `this.combo++`, add:

```javascript
        sound.setComboLevel(this.combo);
```

- [ ] **Step 8: Add heartbeat trigger to countdown timer**

In `_startCountdown()` interval callback (from Task 2), after vignette code, add:

```javascript
            // Heartbeat sound at critical time
            if (ratio < 0.05 && Math.floor(this.timeRemaining * 1.5) % 1 === 0) {
                if (!this._lastHeartbeat || Date.now() - this._lastHeartbeat > 600) {
                    sound.play('heartbeat');
                    this._lastHeartbeat = Date.now();
                }
            }
```

- [ ] **Step 9: Add crack effect to wrong move**

In `handleWrongMove()` in `js/game.js`, after the existing screen shake code, add:

```javascript
        // Crack effect on canvas
        this.renderer.showCrackEffect(
            this.renderer.gridOffsetX + (path.getHead().x + 0.5) * this.renderer.cellSize,
            this.renderer.gridOffsetY + (path.getHead().y + 0.5) * this.renderer.cellSize
        );
```

Add `showCrackEffect` to `js/renderer.js`:

```javascript
    showCrackEffect(cx, cy) {
        this._crackEffect = { cx, cy, start: performance.now(), duration: 300 };
    }

    _drawCrackEffect() {
        if (!this._crackEffect) return;
        const elapsed = performance.now() - this._crackEffect.start;
        if (elapsed > this._crackEffect.duration) {
            this._crackEffect = null;
            return;
        }
        const { ctx } = this;
        const alpha = 1 - elapsed / this._crackEffect.duration;
        const { cx, cy } = this._crackEffect;

        ctx.save();
        ctx.strokeStyle = `rgba(200, 40, 40, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        // Radial crack lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const len = 20 + Math.random() * 30;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            const midX = cx + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
            const midY = cy + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
            ctx.lineTo(midX, midY);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }
```

Then call `this._drawCrackEffect()` at the end of `drawGrid()`, just before `_drawVignette()`.

- [ ] **Step 10: Test combo effects**

Open game, play a level. Verify:
- Single removal: small particle burst
- Combo x3+: bigger burst, yellow score text
- Combo x6+: shockwave, orange text, screen shake
- Combo x10+: gold explosion, "MUHTESEM!" text, mega sound
- Wrong move: crack effect + deeper thud
- Critical timer: heartbeat sound

- [ ] **Step 11: Commit**

```bash
git add js/game.js js/renderer.js js/sound.js
git commit -m "feat: add combo-scaled removal effects, crack effect, and heartbeat sound"
```

---

### Task 7: Arrow Style Variations per Chapter

**Files:**
- Modify: `js/renderer.js:201-280` (drawPath method)

- [ ] **Step 1: Update drawPath to use chapter-based arrow styles**

In `drawPath()` method, update the line drawing section. Find where the arrow body is drawn (around line 260-275 where `ctx.lineWidth` and `ctx.strokeStyle` are set). Replace the line drawing with style-aware code:

```javascript
        // Arrow body style based on chapter
        const style = this.arrowStyle;
        const metrics = this._getArrowMetrics();
        ctx.lineWidth = style.lineWidth * this.cellSize;

        if (style.dash) {
            ctx.setLineDash(style.dash);
        } else {
            ctx.setLineDash([]);
        }

        // Draw arrow body
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._strokePoints(ctx, points);

        ctx.setLineDash([]); // reset

        // Arrow head based on style
        if (style.headStyle === 'forked') {
            this._drawForkedArrowHead(ctx, tipX, tipY, path.direction, color, metrics);
        } else {
            this._drawArrowHead(ctx, tipX, tipY, path.direction, color, metrics);
        }

        // Golden shimmer for chapter 10
        if (style.shimmer) {
            const shimmerAlpha = 0.15 + 0.1 * Math.sin(this.animTime / 400 + path.colorIndex);
            ctx.strokeStyle = `rgba(255, 215, 0, ${shimmerAlpha})`;
            ctx.lineWidth = (style.lineWidth + 0.02) * this.cellSize;
            this._strokePoints(ctx, points);
        }
```

- [ ] **Step 2: Add forked arrowhead method**

Add to `js/renderer.js`:

```javascript
    _drawForkedArrowHead(ctx, tipX, tipY, direction, color, metrics) {
        const size = metrics.headSize;
        const spread = metrics.headSpread;
        const forkGap = size * 0.25;

        ctx.fillStyle = color;
        ctx.beginPath();

        switch (direction) {
            case 'up':
                ctx.moveTo(tipX, tipY - size);
                ctx.lineTo(tipX - spread, tipY);
                ctx.lineTo(tipX - forkGap, tipY - size * 0.3);
                ctx.lineTo(tipX, tipY - size * 0.15);
                ctx.lineTo(tipX + forkGap, tipY - size * 0.3);
                ctx.lineTo(tipX + spread, tipY);
                break;
            case 'down':
                ctx.moveTo(tipX, tipY + size);
                ctx.lineTo(tipX - spread, tipY);
                ctx.lineTo(tipX - forkGap, tipY + size * 0.3);
                ctx.lineTo(tipX, tipY + size * 0.15);
                ctx.lineTo(tipX + forkGap, tipY + size * 0.3);
                ctx.lineTo(tipX + spread, tipY);
                break;
            case 'left':
                ctx.moveTo(tipX - size, tipY);
                ctx.lineTo(tipX, tipY - spread);
                ctx.lineTo(tipX - size * 0.3, tipY - forkGap);
                ctx.lineTo(tipX - size * 0.15, tipY);
                ctx.lineTo(tipX - size * 0.3, tipY + forkGap);
                ctx.lineTo(tipX, tipY + spread);
                break;
            case 'right':
                ctx.moveTo(tipX + size, tipY);
                ctx.lineTo(tipX, tipY - spread);
                ctx.lineTo(tipX + size * 0.3, tipY - forkGap);
                ctx.lineTo(tipX + size * 0.15, tipY);
                ctx.lineTo(tipX + size * 0.3, tipY + forkGap);
                ctx.lineTo(tipX, tipY + spread);
                break;
        }
        ctx.closePath();
        ctx.fill();
    }
```

- [ ] **Step 3: Test arrow styles**

Open browser. Navigate to different chapters:
- Chapter 1-3: solid clean arrows
- Chapter 4-6: dashed arrow bodies
- Chapter 7-9: forked arrowheads
- Chapter 10: golden shimmer overlay

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js
git commit -m "feat: add chapter-based arrow style variations (dash, forked head, shimmer)"
```

---

### Task 8: Updated Star System and Progression

**Files:**
- Modify: `js/game.js:126-131` (calculateStars)
- Modify: `js/storage.js` (add star helpers)
- Modify: `js/screens.js:44-93` (chapter cards with stars)
- Modify: `js/main.js:31-79` (animated star reveal)
- Modify: `css/style.css` (star animation)

- [ ] **Step 1: Update calculateStars in game.js**

Replace `calculateStars()` (lines 126-131):

```javascript
    calculateStars() {
        const ratio = this.timeRemaining / this.timeLimit;
        if (ratio >= 0.7 && this.wrongMoves === 0 && !this.usedHint) return 3;
        if (ratio >= 0.5 && this.wrongMoves <= 2) return 2;
        return 1;
    }
```

- [ ] **Step 2: Add star helper methods to storage.js**

Add before `resetAll()` (line 140) in `js/storage.js`:

```javascript
    getChapterStars(chapterId) {
        const data = loadData();
        const prefix = this.getChapterPrefix(chapterId);
        let total = 0;
        for (const [id, score] of Object.entries(data.levelScores || {})) {
            if (id.startsWith(prefix) && score.stars) {
                total += score.stars;
            }
        }
        return total;
    },

    getTotalStars() {
        const data = loadData();
        let total = 0;
        for (const score of Object.values(data.levelScores || {})) {
            if (score.stars) total += score.stars;
        }
        return total;
    },
```

- [ ] **Step 3: Update chapter unlock logic in storage.js**

Replace `completeLevel()` method (lines 35-48):

```javascript
    completeLevel(levelId, chapterId) {
        const data = loadData();
        if (!data.completedLevels.includes(levelId)) {
            data.completedLevels.push(levelId);
        }
        // Star-based unlock: need 10+ stars in current chapter to unlock next
        const nextChapter = chapterId + 1;
        if (nextChapter <= 10 && !data.unlockedChapters.includes(nextChapter)) {
            const chapterStars = this.getChapterStars(chapterId);
            if (chapterStars >= 10) {
                data.unlockedChapters.push(nextChapter);
            }
        }
        saveData(data);
    },
```

- [ ] **Step 4: Add star display to chapter cards in screens.js**

In `showChapters()`, after `diffSpan` creation (line 67-68), add star count:

```javascript
            const starsSpan = document.createElement('div');
            starsSpan.className = 'chapter-stars';
            const chapterStars = storage.getChapterStars(chapter.id);
            starsSpan.textContent = `\u2605 ${chapterStars}/15`;
            infoDiv.appendChild(starsSpan);
```

Also add total stars to the chapter screen header. In `showChapters()`, after `list.innerHTML = ''` (line 46), add:

```javascript
        // Update total stars in header
        const header = document.querySelector('#screen-chapters .screen-header h2');
        if (header) {
            header.textContent = `Bolumler \u2605 ${storage.getTotalStars()}/150`;
        }
```

- [ ] **Step 5: Add animated star reveal to completion overlay in main.js**

In the `game.onLevelComplete` handler, replace the star rendering section (lines 36-45):

```javascript
    // Animated stars
    const starsEl = document.getElementById('complete-stars');
    if (starsEl && stats) {
        starsEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.className = i < stats.stars ? 'star filled' : 'star empty';
            star.textContent = i < stats.stars ? '\u2605' : '\u2606';
            if (i < stats.stars) {
                star.style.animationDelay = `${i * 0.4}s`;
                star.classList.add('star-animate');
            }
            starsEl.appendChild(star);
        }
    }

    // Add remaining time to stats
    const statsEl = document.getElementById('complete-stats');
    if (statsEl && stats) {
        const timeSecs = Math.floor(stats.time / 1000);
        const mins = Math.floor(timeSecs / 60);
        const secs = timeSecs % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        const parts = [`Sure: ${timeStr}`];
        if (stats.timeRemaining > 0) parts.push(`Kalan: ${stats.timeRemaining}s`);
        parts.push(`Hamle: ${stats.moves}`);
        if (stats.maxCombo > 1) parts.push(`Max Combo: x${stats.maxCombo}`);
        if (stats.wrongMoves > 0) parts.push(`Yanlis: ${stats.wrongMoves}`);
        statsEl.textContent = parts.join(' | ');
    }
```

- [ ] **Step 6: Add star animation CSS**

Append to `css/style.css`:

```css
/* Star reveal animation */
.star-animate {
    animation: starReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes starReveal {
    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
    60% { transform: scale(1.3) rotate(10deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.chapter-stars {
    font-size: 0.75em;
    color: var(--theme-accent);
    margin-top: 2px;
}
```

- [ ] **Step 7: Test star system**

Play and complete a level. Verify:
- Stars animate in one by one with bounce
- 3 stars requires 70%+ time remaining + 0 wrongs + no hints
- 2 stars requires 50%+ time remaining + max 2 wrongs
- Chapter card shows star count (e.g. "5/15")
- Header shows total stars

- [ ] **Step 8: Commit**

```bash
git add js/game.js js/storage.js js/screens.js js/main.js css/style.css
git commit -m "feat: update star system with time-based criteria and chapter star display"
```

---

### Task 9: New Arrow Mechanics (Armor, Freeze, Chain, Mirror)

**Files:**
- Modify: `js/game.js:153-236` (setupInput / handleTap area)
- Modify: `js/renderer.js:201-280` (drawPath for mechanic visuals)

- [ ] **Step 1: Add mechanic handler methods to game.js**

Add after `handleWrongMove()` method in `js/game.js`:

```javascript
    // --- Chapter-specific mechanics ---

    _getChapterMechanics() {
        const ch = this.currentChapter?.id || 1;
        return {
            hasArmor: ch >= 3,    // Roma+
            hasFreeze: ch >= 4,   // Viking+
            hasChain: ch >= 5,    // Ottoman+
            hasMirror: ch >= 6,   // China+
        };
    }

    handleArmorHit(path) {
        if (path.armor > 1) {
            path.armor--;
            sound.play('tap');
            // Visual feedback: armor crack
            const head = path.getHead();
            const cx = this.renderer.gridOffsetX + (head.x + 0.5) * this.renderer.cellSize;
            const cy = this.renderer.gridOffsetY + (head.y + 0.5) * this.renderer.cellSize;
            this.renderer.burstParticles.burst(cx, cy, 6, {
                speed: 60, life: 0.3, size: 2,
                colors: ['#a0a0a0', '#c0c0c0', '#808080'],
                gravity: 100, shape: 'square',
            });
            this.addTime(1); // Small time bonus for cracking armor
            return true; // Consumed the tap
        }
        return false; // Armor depleted, proceed with normal removal
    }

    handleFreezeSpread(removedPath) {
        const head = removedPath.getHead();
        const frozenPaths = [];
        for (const p of this.grid.paths) {
            if (p === removedPath || p.state !== 'idle') continue;
            if (!p.frozenUntil && p.cells.some(c =>
                Math.abs(c.x - head.x) <= 1 && Math.abs(c.y - head.y) <= 1
            )) {
                // Check if this path was marked as a freeze source
                if (removedPath._isFreezeSource) {
                    p.frozenUntil = Date.now() + 3000;
                    frozenPaths.push(p);
                }
            }
        }
        return frozenPaths;
    }

    handleChainRemoval(path) {
        if (!path.chainGroupId) return [];
        const chainPaths = this.grid.paths.filter(p =>
            p !== path &&
            p.chainGroupId === path.chainGroupId &&
            p.state === 'removable'
        );
        return chainPaths;
    }

    handleMirrorRemoval(path) {
        if (!path.mirrorPairId) return null;
        const mirror = this.grid.paths.find(p =>
            p !== path &&
            p.mirrorPairId === path.mirrorPairId &&
            p.state === 'removable'
        );
        return mirror;
    }
```

- [ ] **Step 2: Update the tap handler to use mechanics**

In `setupInput()`, find the section where a tapped path is processed (the click handler around lines 155-176). Replace the core logic where `isPathClear` is checked and `removePathWithAnimation` / `handleWrongMove` is called:

```javascript
            // Check frozen
            if (tappedPath.frozenUntil && Date.now() < tappedPath.frozenUntil) {
                // Frozen - can't interact, just show ice effect
                sound.play('tap');
                return;
            }

            // Check armor
            if (tappedPath.armor > 0 && this.grid.isPathClear(tappedPath)) {
                if (this.handleArmorHit(tappedPath)) return;
            }

            if (this.grid.isPathClear(tappedPath)) {
                // Normal removal
                this.removePathWithAnimation(tappedPath);

                // Chain removal
                const chainPaths = this.handleChainRemoval(tappedPath);
                for (const cp of chainPaths) {
                    setTimeout(() => this.removePathWithAnimation(cp), 150);
                }

                // Mirror removal
                const mirror = this.handleMirrorRemoval(tappedPath);
                if (mirror) {
                    setTimeout(() => this.removePathWithAnimation(mirror), 200);
                }

                // Freeze spread
                this.handleFreezeSpread(tappedPath);
            } else {
                this.handleWrongMove(tappedPath);
            }
```

- [ ] **Step 3: Add mechanic visual indicators to renderer.js drawPath**

In `drawPath()`, after the main arrow is drawn, add mechanic overlays:

```javascript
        // Mechanic visual overlays
        if (path.armor > 0) {
            // Metallic sheen overlay
            ctx.save();
            ctx.strokeStyle = `rgba(180, 190, 200, ${0.4 + 0.1 * Math.sin(this.animTime / 500)})`;
            ctx.lineWidth = (this.arrowStyle.lineWidth + 0.03) * this.cellSize;
            ctx.setLineDash([3, 3]);
            this._strokePoints(ctx, points);
            ctx.setLineDash([]);
            // Armor count badge
            const head = path.getHead();
            const hx = this.gridOffsetX + (head.x + 0.5) * this.cellSize;
            const hy = this.gridOffsetY + (head.y + 0.5) * this.cellSize;
            ctx.fillStyle = '#c0c0c0';
            ctx.font = `bold ${this.cellSize * 0.3}px Georgia`;
            ctx.textAlign = 'center';
            ctx.fillText(path.armor.toString(), hx, hy + this.cellSize * 0.1);
            ctx.restore();
        }

        if (path.frozenUntil && Date.now() < path.frozenUntil) {
            // Ice overlay
            ctx.save();
            const iceAlpha = 0.3 + 0.1 * Math.sin(this.animTime / 300);
            ctx.strokeStyle = `rgba(100, 180, 220, ${iceAlpha})`;
            ctx.lineWidth = (this.arrowStyle.lineWidth + 0.04) * this.cellSize;
            this._strokePoints(ctx, points);
            // Ice crystals at head
            const head = path.getHead();
            const hx = this.gridOffsetX + (head.x + 0.5) * this.cellSize;
            const hy = this.gridOffsetY + (head.y + 0.5) * this.cellSize;
            ctx.strokeStyle = `rgba(150, 210, 240, ${iceAlpha})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + this.animTime / 2000;
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(hx + Math.cos(a) * this.cellSize * 0.3, hy + Math.sin(a) * this.cellSize * 0.3);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (path.chainGroupId) {
            // Chain link indicators between same-group arrows
            // Small chain icon at tail
            const tail = path.cells[0];
            const tx = this.gridOffsetX + (tail.x + 0.5) * this.cellSize;
            const ty = this.gridOffsetY + (tail.y + 0.5) * this.cellSize;
            ctx.save();
            ctx.strokeStyle = `rgba(200, 160, 60, 0.5)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(tx, ty, this.cellSize * 0.15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(tx + this.cellSize * 0.1, ty, this.cellSize * 0.15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (path.mirrorPairId) {
            // Mirror shimmer at head
            const head = path.getHead();
            const hx = this.gridOffsetX + (head.x + 0.5) * this.cellSize;
            const hy = this.gridOffsetY + (head.y + 0.5) * this.cellSize;
            ctx.save();
            const shimmer = 0.3 + 0.2 * Math.sin(this.animTime / 600);
            ctx.strokeStyle = `rgba(200, 200, 255, ${shimmer})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(hx, hy, this.cellSize * 0.25, 0, Math.PI * 2);
            ctx.stroke();
            // Small mirror icon
            ctx.fillStyle = `rgba(200, 200, 255, ${shimmer})`;
            ctx.font = `${this.cellSize * 0.25}px Georgia`;
            ctx.textAlign = 'center';
            ctx.fillText('\u{1F53D}', hx, hy - this.cellSize * 0.3);
            ctx.restore();
        }
```

- [ ] **Step 4: Test mechanics visually**

For now the mechanics won't appear in levels (levels don't assign these fields yet). To test, temporarily add to `startLevel()` in `game.js`:

```javascript
        // TEMPORARY: test mechanics
        // if (chapterData.id >= 3) this.grid.paths[0].armor = 2;
        // if (chapterData.id >= 4) this.grid.paths[1]._isFreezeSource = true;
```

Uncomment, verify armor badge shows and decrements on click, then re-comment.

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/renderer.js
git commit -m "feat: add armor, freeze, chain, mirror arrow mechanics with visual indicators"
```

---

### Task 10: Regenerate Levels with New Parameters

**Files:**
- Modify: `generate-levels.mjs:59-70` (CHAPTER_CONFIG)
- Modify: `generate-levels.mjs:1220-1281` (levelSpecs grid sizes)
- Modify: `generate-levels.mjs:1379-1401` (formatLevel output for mechanics)

- [ ] **Step 1: Update CHAPTER_CONFIG density values**

Replace `CHAPTER_CONFIG` (lines 59-70) in `generate-levels.mjs`:

```javascript
const CHAPTER_CONFIG = {
    1:  { trapRatio: 0.05, chainDepth: 1, density: 0.92, maxPathLen: 4,  turnChance: 0.30 },
    2:  { trapRatio: 0.15, chainDepth: 1, density: 0.92, maxPathLen: 5,  turnChance: 0.35 },
    3:  { trapRatio: 0.30, chainDepth: 2, density: 0.94, maxPathLen: 6,  turnChance: 0.40 },
    4:  { trapRatio: 0.45, chainDepth: 2, density: 0.94, maxPathLen: 7,  turnChance: 0.50 },
    5:  { trapRatio: 0.55, chainDepth: 3, density: 0.95, maxPathLen: 8,  turnChance: 0.55 },
    6:  { trapRatio: 0.65, chainDepth: 4, density: 0.95, maxPathLen: 9,  turnChance: 0.60 },
    7:  { trapRatio: 0.75, chainDepth: 4, density: 0.96, maxPathLen: 10, turnChance: 0.65 },
    8:  { trapRatio: 0.82, chainDepth: 5, density: 0.96, maxPathLen: 11, turnChance: 0.70 },
    9:  { trapRatio: 0.88, chainDepth: 5, density: 0.97, maxPathLen: 12, turnChance: 0.75 },
    10: { trapRatio: 0.92, chainDepth: 6, density: 0.97, maxPathLen: 14, turnChance: 0.80 },
};
```

- [ ] **Step 2: Update levelSpecs grid sizes**

Replace `levelSpecs` array (lines 1220-1281). The grid sizes increase:

```javascript
const levelSpecs = [
    // CH1: MISIR - Kolay (16x20 -> 18x22)
    { id: 'egypt_1', chapter: 1, level: 1,  name: 'Piramit',   w: 16, h: 20, shape: 'pyramid',     seedStart: 1000 },
    { id: 'egypt_2', chapter: 1, level: 2,  name: 'Sfenks',    w: 16, h: 20, shape: 'sphinx',      seedStart: 2000 },
    { id: 'egypt_3', chapter: 1, level: 3,  name: 'Elmas',     w: 17, h: 21, shape: 'diamond',     seedStart: 3000 },
    { id: 'egypt_4', chapter: 1, level: 4,  name: 'Basamak',   w: 17, h: 21, shape: 'steppyramid', seedStart: 4000 },
    { id: 'egypt_5', chapter: 1, level: 5,  name: 'Firavun',   w: 18, h: 22, shape: 'solidoval',   seedStart: 5000 },
    // CH2: YUNAN - Orta (18x22 -> 20x24)
    { id: 'greek_1', chapter: 2, level: 6,  name: 'Parthenon', w: 18, h: 22, shape: 'temple',      seedStart: 6000 },
    { id: 'greek_2', chapter: 2, level: 7,  name: 'Amphora',   w: 18, h: 23, shape: 'amphora',     seedStart: 7000 },
    { id: 'greek_3', chapter: 2, level: 8,  name: 'Olympia',   w: 19, h: 23, shape: 'diamond',     seedStart: 8000 },
    { id: 'greek_4', chapter: 2, level: 9,  name: 'Akropolis', w: 19, h: 24, shape: 'solidoval',   seedStart: 9000 },
    { id: 'greek_5', chapter: 2, level: 10, name: 'Atina',     w: 20, h: 24, shape: 'steppyramid', seedStart: 10000 },
    // CH3: ROMA - Zor (20x24 -> 22x26)
    { id: 'rome_1', chapter: 3, level: 11, name: 'Kolezyum',   w: 20, h: 24, shape: 'arch',        seedStart: 11000 },
    { id: 'rome_2', chapter: 3, level: 12, name: 'Kartal',     w: 20, h: 25, shape: 'eagle',       seedStart: 12000 },
    { id: 'rome_3', chapter: 3, level: 13, name: 'Su Kemeri',  w: 21, h: 25, shape: 'aqueduct',    seedStart: 13000 },
    { id: 'rome_4', chapter: 3, level: 14, name: 'Arena',      w: 21, h: 26, shape: 'oval4',       seedStart: 14000 },
    { id: 'rome_5', chapter: 3, level: 15, name: 'Sezar',      w: 22, h: 26, shape: 'solidoval',   seedStart: 15000 },
    // CH4: VIKING - Zor+ (22x26 -> 24x28)
    { id: 'viking_1', chapter: 4, level: 16, name: 'Drakkar',   w: 22, h: 26, shape: 'ship',        seedStart: 16000 },
    { id: 'viking_2', chapter: 4, level: 17, name: 'Mjolnir',   w: 22, h: 27, shape: 'hammer',      seedStart: 17000 },
    { id: 'viking_3', chapter: 4, level: 18, name: 'Runik',     w: 23, h: 27, shape: 'diamond',     seedStart: 18000 },
    { id: 'viking_4', chapter: 4, level: 19, name: 'Fiyort',    w: 23, h: 28, shape: 'solidoval',   seedStart: 19000 },
    { id: 'viking_5', chapter: 4, level: 20, name: 'Valhalla',  w: 24, h: 28, shape: 'steppyramid', seedStart: 20000 },
    // CH5: OSMANLI - Cok Zor (24x28 -> 26x30)
    { id: 'ottoman_1', chapter: 5, level: 21, name: 'Cami',     w: 24, h: 28, shape: 'mosque',      seedStart: 21000 },
    { id: 'ottoman_2', chapter: 5, level: 22, name: 'Lale',     w: 24, h: 29, shape: 'tulip',       seedStart: 22000 },
    { id: 'ottoman_3', chapter: 5, level: 23, name: 'Kubbe',    w: 25, h: 29, shape: 'solidoval',   seedStart: 23000 },
    { id: 'ottoman_4', chapter: 5, level: 24, name: 'Minare',   w: 25, h: 30, shape: 'castle',      seedStart: 24000 },
    { id: 'ottoman_5', chapter: 5, level: 25, name: 'Sultan',   w: 26, h: 30, shape: 'diamond',     seedStart: 25000 },
    // CH6: CIN - Cok Zor+ (26x30 -> 28x32)
    { id: 'china_1', chapter: 6, level: 26, name: 'Pagoda',     w: 26, h: 30, shape: 'pagoda',      seedStart: 26000 },
    { id: 'china_2', chapter: 6, level: 27, name: 'Ejderha',    w: 26, h: 31, shape: 'dragon',      seedStart: 27000 },
    { id: 'china_3', chapter: 6, level: 28, name: 'Ipek Yolu',  w: 27, h: 31, shape: 'steppyramid', seedStart: 28000 },
    { id: 'china_4', chapter: 6, level: 29, name: 'Sur',        w: 27, h: 32, shape: 'castle',      seedStart: 29000 },
    { id: 'china_5', chapter: 6, level: 30, name: 'Imparator',  w: 28, h: 32, shape: 'solidoval',   seedStart: 30000 },
    // CH7: MAYA - Efsanevi (28x32 -> 30x34)
    { id: 'maya_1', chapter: 7, level: 31, name: 'Piramit',     w: 28, h: 32, shape: 'mayapyramid', seedStart: 31000 },
    { id: 'maya_2', chapter: 7, level: 32, name: 'Takvim',      w: 28, h: 33, shape: 'suncalendar', seedStart: 32000 },
    { id: 'maya_3', chapter: 7, level: 33, name: 'Jaguar',      w: 29, h: 33, shape: 'solidoval',   seedStart: 33000 },
    { id: 'maya_4', chapter: 7, level: 34, name: 'Gunes',       w: 29, h: 34, shape: 'diamond',     seedStart: 34000 },
    { id: 'maya_5', chapter: 7, level: 35, name: 'Kukulkan',    w: 30, h: 34, shape: 'steppyramid', seedStart: 35000 },
    // CH8: HINT - Efsanevi+ (30x34 -> 32x36)
    { id: 'india_1', chapter: 8, level: 36, name: 'Tac Mahal',  w: 30, h: 34, shape: 'tajmahal',    seedStart: 36000 },
    { id: 'india_2', chapter: 8, level: 37, name: 'Lotus',      w: 30, h: 35, shape: 'lotus',       seedStart: 37000 },
    { id: 'india_3', chapter: 8, level: 38, name: 'Mandala',    w: 31, h: 35, shape: 'solidoval',   seedStart: 38000 },
    { id: 'india_4', chapter: 8, level: 39, name: 'Ganj',       w: 31, h: 36, shape: 'diamond',     seedStart: 39000 },
    { id: 'india_5', chapter: 8, level: 40, name: 'Mogol',      w: 32, h: 36, shape: 'steppyramid', seedStart: 40000 },
    // CH9: ORTACAG - Kabus (32x36 -> 34x38)
    { id: 'medieval_1', chapter: 9, level: 41, name: 'Kale',    w: 32, h: 36, shape: 'castle',      seedStart: 41000 },
    { id: 'medieval_2', chapter: 9, level: 42, name: 'Kalkan',   w: 32, h: 37, shape: 'shield',     seedStart: 42000 },
    { id: 'medieval_3', chapter: 9, level: 43, name: 'Katedral', w: 33, h: 37, shape: 'temple',     seedStart: 43000 },
    { id: 'medieval_4', chapter: 9, level: 44, name: 'Simyaci',  w: 33, h: 38, shape: 'solidoval',  seedStart: 44000 },
    { id: 'medieval_5', chapter: 9, level: 45, name: 'Ejderha',  w: 34, h: 38, shape: 'diamond',    seedStart: 45000 },
    // CH10: FINAL - Kabus+ (34x38 -> 36x40)
    { id: 'final_1', chapter: 10, level: 46, name: 'Birlesim',  w: 34, h: 38, shape: 'solidoval',   seedStart: 46000 },
    { id: 'final_2', chapter: 10, level: 47, name: 'Portal',    w: 34, h: 39, shape: 'portal',      seedStart: 47000 },
    { id: 'final_3', chapter: 10, level: 48, name: 'Efsane',    w: 35, h: 39, shape: 'mosque',      seedStart: 48000 },
    { id: 'final_4', chapter: 10, level: 49, name: 'Miras',     w: 35, h: 40, shape: 'castle',      seedStart: 49000 },
    { id: 'final_5', chapter: 10, level: 50, name: 'Sonsuzluk', w: 36, h: 40, shape: 'diamond',     seedStart: 50000 },
];
```

- [ ] **Step 3: Add mechanic assignment to level output**

In the `formatLevel()` function (lines 1379-1395), update the path output to include mechanic fields. After the paths are generated and before they're formatted, add a post-processing step in the generation loop (around line 1360, after `fixSolvability`):

```javascript
        // Assign mechanics based on chapter
        const chapterNum = spec.chapter;
        if (chapterNum >= 3) {
            // Armor: ~20% of paths in chapter 3+
            const armorCount = Math.floor(paths.length * 0.2);
            const shuffled = [...paths].sort(() => Math.random() - 0.5);
            for (let i = 0; i < armorCount && i < shuffled.length; i++) {
                shuffled[i]._armor = 2;
            }
        }
        if (chapterNum >= 4) {
            // Freeze sources: ~25% of paths
            const freezeCount = Math.floor(paths.length * 0.25);
            const candidates = paths.filter(p => !p._armor);
            const shuffled = candidates.sort(() => Math.random() - 0.5);
            for (let i = 0; i < freezeCount && i < shuffled.length; i++) {
                shuffled[i]._freezeSource = true;
            }
        }
        if (chapterNum >= 5) {
            // Chain groups: group adjacent same-color paths
            let groupId = 0;
            const ungrouped = paths.filter(p => !p._armor && !p._freezeSource);
            for (let i = 0; i < ungrouped.length; i++) {
                if (ungrouped[i]._chainGroup) continue;
                const group = [ungrouped[i]];
                for (let j = i + 1; j < ungrouped.length; j++) {
                    if (ungrouped[j]._chainGroup) continue;
                    if (ungrouped[j].colorIndex === ungrouped[i].colorIndex) {
                        // Check adjacency
                        const adjacent = group.some(gp =>
                            gp.cells.some(gc =>
                                ungrouped[j].cells.some(jc =>
                                    Math.abs(gc.x - jc.x) + Math.abs(gc.y - jc.y) === 1
                                )
                            )
                        );
                        if (adjacent && group.length < 3) {
                            group.push(ungrouped[j]);
                        }
                    }
                }
                if (group.length >= 2) {
                    const gid = `chain_${groupId++}`;
                    group.forEach(p => p._chainGroup = gid);
                }
            }
        }
        if (chapterNum >= 6) {
            // Mirror pairs: pair paths with opposite directions
            let mirrorId = 0;
            const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const unpaired = paths.filter(p => !p._armor && !p._freezeSource && !p._chainGroup && !p._mirrorPair);
            for (let i = 0; i < unpaired.length; i++) {
                if (unpaired[i]._mirrorPair) continue;
                const opp = opposites[unpaired[i].direction];
                for (let j = i + 1; j < unpaired.length; j++) {
                    if (unpaired[j]._mirrorPair) continue;
                    if (unpaired[j].direction === opp) {
                        const mid = `mirror_${mirrorId++}`;
                        unpaired[i]._mirrorPair = mid;
                        unpaired[j]._mirrorPair = mid;
                        break;
                    }
                }
                if (mirrorId >= Math.floor(paths.length * 0.15)) break;
            }
        }
```

Update `formatLevel()` to include mechanic fields in the path data:

```javascript
function formatLevel(spec, paths) {
    const pathStrs = paths.map(p => {
        const cells = p.cells.map(c => `[${c.x},${c.y}]`).join(',');
        let extra = '';
        if (p._armor) extra += `, armor: ${p._armor}`;
        if (p._freezeSource) extra += `, freezeSource: true`;
        if (p._chainGroup) extra += `, chainGroup: '${p._chainGroup}'`;
        if (p._mirrorPair) extra += `, mirrorPair: '${p._mirrorPair}'`;
        return `{cells:[${cells}],direction:'${p.direction}'${extra}}`;
    });
    // ... rest of format
```

- [ ] **Step 4: Update Grid.loadFromData to read mechanic fields**

In `js/grid.js` (the `loadFromData` method), ensure mechanic fields are copied from level data to ArrowPath:

Find where paths are created from data and add:

```javascript
        // After creating ArrowPath from data:
        if (pathData.armor) arrowPath.armor = pathData.armor;
        if (pathData.freezeSource) arrowPath._isFreezeSource = true;
        if (pathData.chainGroup) arrowPath.chainGroupId = pathData.chainGroup;
        if (pathData.mirrorPair) arrowPath.mirrorPairId = pathData.mirrorPair;
```

- [ ] **Step 5: Run level generation**

```bash
cd "c:/Users/User/Desktop/ok oyunu" && node generate-levels.mjs
```

Verify output shows 50 levels generated with increased coverage stats.

- [ ] **Step 6: Test a few levels in browser**

Open browser and play:
- Egypt level 1: denser grid, no mechanics
- Rome level 1: some armored arrows visible
- Viking level 1: some freeze sources
- Ottoman level 1: chain groups visible
- China level 1: mirror pairs visible

- [ ] **Step 7: Commit**

```bash
git add generate-levels.mjs js/data/levels/ js/grid.js
git commit -m "feat: regenerate all 50 levels with higher density and chapter mechanics"
```

---

### Task 11: Integration Testing and Polish

**Files:**
- Various touch-ups across all modified files

- [ ] **Step 1: Full playthrough test - Egypt chapter**

Play Egypt levels 1-2. Verify:
- Countdown timer works (starts ~150s, counts down)
- Sand particles drift across screen
- Pyramid silhouettes visible at bottom
- Clean arrow style
- Particle burst on removal
- Stars awarded correctly on completion

- [ ] **Step 2: Full playthrough test - Rome chapter (armor)**

Play Rome level 1. Verify:
- Armored arrows show metallic overlay with count badge
- First tap cracks armor (count decreases, particles)
- Second tap removes the arrow
- Timer bonus still works on armor crack

- [ ] **Step 3: Full playthrough test - Viking chapter (freeze)**

Play Viking level 1. Verify:
- Snowflake particles fall
- Removing a freeze-source arrow freezes nearby arrows for 3s
- Frozen arrows show ice overlay and are untappable
- Freeze wears off after 3 seconds

- [ ] **Step 4: Full playthrough test - Ottoman chapter (chains)**

Play Ottoman level 1. Verify:
- Chain-linked arrows show chain icon at tail
- Removing one chain member auto-removes other removable members
- Combo increases for each auto-removed arrow

- [ ] **Step 5: Full playthrough test - China chapter (mirrors)**

Play China level 1. Verify:
- Mirror pairs show shimmer circle
- Removing one mirror arrow auto-removes its pair (if removable)

- [ ] **Step 6: Test edge cases**

- Let timer run to 0: verify "Sure Doldu!" overlay appears and costs a life
- Get 0 lives via timer + wrong moves: verify no-lives overlay appears
- Complete a level with 3 stars: verify 70%+ time remaining, 0 wrongs, no hints
- Complete with 2 stars: verify criteria
- Check chapter unlock: verify 10 stars needed
- Test pinch-zoom still works with new particles
- Test window resize

- [ ] **Step 7: Performance check**

Open browser DevTools, check frame rate during gameplay with particles active. Target: stable 60fps on mobile. If particles cause drops:
- Reduce ambient particle count
- Reduce burst particle count for low combos

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: gameplay overhaul - timer, particles, themes, mechanics, star system"
```
