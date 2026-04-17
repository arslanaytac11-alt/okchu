# Gameplay Overhaul: Snake Animation, Difficulty Balance, Sound Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform arrow removal into snake-like cell-by-cell animation, fix difficulty balance so early levels are easy and late levels are genuinely hard, and redesign sounds to be satisfying.

**Architecture:** Replace the current "whole path slides out" animation in `game.js:removePathWithAnimation` with a sequential cell-by-cell disappear animation. Update `generate-levels.mjs` CHAPTER_CONFIG for proper difficulty curve. Rewrite `sound.js` with richer Web Audio synthesis.

**Tech Stack:** Vanilla JS, Canvas 2D, Web Audio API

---

### Task 1: Snake-Like Cell-by-Cell Removal Animation

**Files:**
- Modify: `js/game.js` — `removePathWithAnimation` method (lines 239-318)
- Modify: `js/renderer.js` — add `drawPartialPath` method for drawing a path with some cells removed
- Modify: `js/grid.js` — add `ArrowState.SNAKE_REMOVING` support

**Concept:** When a path is removed, cells disappear one by one from tail to head, each sliding in the arrow's direction. 60ms delay between each cell. After all cells gone, the arrow head shoots off in the direction.

- [ ] **Step 1: Add SNAKE_REMOVING state to grid.js**

In `js/grid.js`, the `removePath` method currently sets state to `REMOVING`. Add a new intermediate state:

```js
// In grid.js removePath method, change:
removePath(path) {
    path.state = ArrowState.REMOVING;
    path.snakeProgress = 0; // tracks how many cells have been removed
}
```

- [ ] **Step 2: Rewrite removePathWithAnimation in game.js**

Replace the entire `removePathWithAnimation` method with snake animation:

```js
removePathWithAnimation(path) {
    sound.play('remove');
    this.isAnimating = true;
    this.grid.removePath(path);

    // Scoring
    this.combo++;
    this.moves++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const points = this._calculatePoints(path);
    this.score += points;
    this._updateScoreDisplay();
    this._showFloatingScore(points, path);

    const cells = path.cells;
    const totalCells = cells.length;
    const cellDelay = 60;           // ms between each cell disappearing
    const cellAnimDur = 150;        // ms for each cell's slide-out
    const { dx, dy } = getDirectionVector(path.direction);
    const origCells = cells.map(c => ({ x: c.x, y: c.y }));
    const startTime = performance.now();
    const totalDuration = totalCells * cellDelay + cellAnimDur + 100;

    // Track which cells are still visible and their animation offset
    const cellStates = cells.map(() => ({ visible: true, offsetX: 0, offsetY: 0, alpha: 1 }));

    const animate = (time) => {
        const elapsed = time - startTime;

        // Update each cell's state
        for (let i = 0; i < totalCells; i++) {
            const cellStart = i * cellDelay; // tail first (i=0 is tail)
            const cellElapsed = elapsed - cellStart;

            if (cellElapsed < 0) continue; // not started yet

            if (cellElapsed < cellAnimDur) {
                // Cell is sliding out
                const p = cellElapsed / cellAnimDur;
                const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
                cellStates[i].offsetX = dx * ease * 1.5;
                cellStates[i].offsetY = dy * ease * 1.5;
                cellStates[i].alpha = 1 - ease;
            } else {
                // Cell is gone
                cellStates[i].visible = false;
            }
        }

        // Apply offsets to path cells for rendering
        for (let i = 0; i < totalCells; i++) {
            if (cellStates[i].visible) {
                path.cells[i].x = origCells[i].x + cellStates[i].offsetX;
                path.cells[i].y = origCells[i].y + cellStates[i].offsetY;
            }
        }

        // Store cell visibility for renderer
        path._snakeCellStates = cellStates;
        this.renderer.drawGrid(this.grid);

        if (elapsed < totalDuration) {
            requestAnimationFrame(animate);
        } else {
            // Restore and finalize
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
```

- [ ] **Step 3: Update renderer to handle snake cell states**

In `js/renderer.js`, modify `drawPath` to skip invisible cells during snake animation. Add this at the start of `drawPath`:

```js
drawPath(path, isRemovable = false, isRemoving = false) {
    const ctx = this.ctx;
    if (path.cells.length === 0) return;

    // Snake animation: only draw visible cells
    if (path._snakeCellStates) {
        this._drawSnakePath(path);
        return;
    }
    // ... rest of existing drawPath
}
```

Add new method `_drawSnakePath`:

```js
_drawSnakePath(path) {
    const ctx = this.ctx;
    const metrics = this._getArrowMetrics();
    const states = path._snakeCellStates;
    const color = this.theme.arrowRemoving || '#c04030';

    for (let i = 0; i < path.cells.length; i++) {
        if (!states[i].visible) continue;

        const cell = path.cells[i];
        const cx = this.gridOffsetX + cell.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + cell.y * this.cellSize + this.cellSize / 2;
        const alpha = states[i].alpha;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = metrics.width;
        ctx.lineCap = 'round';

        // Draw cell as a dot/segment
        ctx.beginPath();
        ctx.arc(cx, cy, metrics.width * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Draw connection to next visible cell
        if (i < path.cells.length - 1 && states[i + 1].visible) {
            const nextCell = path.cells[i + 1];
            const nx = this.gridOffsetX + nextCell.x * this.cellSize + this.cellSize / 2;
            const ny = this.gridOffsetY + nextCell.y * this.cellSize + this.cellSize / 2;
            const nextAlpha = states[i + 1].alpha;
            ctx.globalAlpha = Math.min(alpha, nextAlpha);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(nx, ny);
            ctx.stroke();
        }

        // Draw arrow head on last visible cell
        const isLastVisible = !states.slice(i + 1).some(s => s.visible);
        if (isLastVisible || i === path.cells.length - 1) {
            ctx.globalAlpha = alpha;
            this._drawArrowHead(ctx, cx, cy, path.direction, color, metrics);
        }
    }
    ctx.globalAlpha = 1;
}
```

- [ ] **Step 4: Test snake animation manually**

Open browser, navigate to level 1, tap an arrow. Should see cells disappearing one by one from tail to head, each sliding in the arrow direction.

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/renderer.js js/grid.js
git commit -m "feat: snake-like cell-by-cell removal animation"
```

---

### Task 2: Difficulty Balance Overhaul

**Files:**
- Modify: `generate-levels.mjs` — `CHAPTER_CONFIG` values and level specs

**Concept:** Current trapRatio goes 0.15-0.85 but early levels still feel random. Fix: Ch1 should have 80%+ of arrows immediately removable (obvious solution). Ch10 should have only 1 arrow removable at start, requiring 6+ step chains.

- [ ] **Step 1: Update CHAPTER_CONFIG for proper difficulty curve**

```js
const CHAPTER_CONFIG = {
    1:  { trapRatio: 0.05, chainDepth: 1, density: 0.85, maxPathLen: 4, turnChance: 0.30 },
    2:  { trapRatio: 0.15, chainDepth: 1, density: 0.85, maxPathLen: 5, turnChance: 0.35 },
    3:  { trapRatio: 0.30, chainDepth: 2, density: 0.88, maxPathLen: 6, turnChance: 0.40 },
    4:  { trapRatio: 0.45, chainDepth: 2, density: 0.88, maxPathLen: 7, turnChance: 0.50 },
    5:  { trapRatio: 0.55, chainDepth: 3, density: 0.90, maxPathLen: 8, turnChance: 0.55 },
    6:  { trapRatio: 0.65, chainDepth: 4, density: 0.90, maxPathLen: 9, turnChance: 0.60 },
    7:  { trapRatio: 0.75, chainDepth: 4, density: 0.90, maxPathLen: 10, turnChance: 0.65 },
    8:  { trapRatio: 0.82, chainDepth: 5, density: 0.92, maxPathLen: 11, turnChance: 0.70 },
    9:  { trapRatio: 0.88, chainDepth: 5, density: 0.92, maxPathLen: 12, turnChance: 0.75 },
    10: { trapRatio: 0.92, chainDepth: 6, density: 0.94, maxPathLen: 14, turnChance: 0.80 },
};
```

Key change: Ch1 trapRatio dropped from 0.15 to 0.05 (almost all arrows point outward = very easy). Ch10 raised to 0.92 (almost all arrows are traps).

- [ ] **Step 2: Improve the hardening pass in fixSolvability**

After solvability is fixed, the hardening pass should ensure Ch1 has many initially-removable arrows and Ch10 has very few. In `fixSolvability`, modify the Phase 2 hardening:

After the existing hardening loop (around line 1086-1118), add a constraint:

```js
// After Phase 2 hardening, check initial removable count
const initialFree = paths.filter((_, i) => isPathClear(paths, i, new Set(), width, height)).length;
const chapterNum = /* pass chapterNum to fixSolvability */;
const config = CHAPTER_CONFIG[chapterNum] || CHAPTER_CONFIG[1];

// For easy chapters, ensure at least 40% are immediately removable
const minFreeRatio = Math.max(0.05, 0.50 - config.trapRatio * 0.5);
const minFree = Math.max(1, Math.floor(paths.length * minFreeRatio));

if (initialFree < minFree) {
    // Flip some trapped arrows back to outward direction
    for (let i = 0; i < paths.length && initialFree < minFree; i++) {
        if (isPathClear(paths, i, new Set(), width, height)) continue;
        const head = paths[i].cells[paths[i].cells.length - 1];
        const outDir = leastBlockedDirection(head[0], head[1], mask, width, height);
        const origDir = paths[i].direction;
        paths[i].direction = outDir;
        if (simulateSolve(paths, width, height).solved) {
            // Kept the flip
        } else {
            paths[i].direction = origDir; // revert
        }
    }
}
```

- [ ] **Step 3: Regenerate all levels**

```bash
cd "c:\Users\User\Desktop\ok oyunu"
node generate-levels.mjs 2>&1 | grep -E "Initially removable"
```

Verify: Ch1 levels should show 40-60% initially removable. Ch10 should show 5-10%.

- [ ] **Step 4: Commit**

```bash
git add generate-levels.mjs js/data/levels/*.js
git commit -m "feat: rebalance difficulty curve - easy ch1, brutal ch10"
```

---

### Task 3: Sound Redesign

**Files:**
- Modify: `js/sound.js` — rewrite all sound effects

**Concept:** Replace thin oscillator beeps with layered, satisfying sounds. "Swoosh" for removal, rising chime for combos, deep thud for wrong, triumphant fanfare for complete.

- [ ] **Step 1: Rewrite sound.js with richer effects**

Replace the entire `play` method switch cases:

```js
play(name) {
    if (!this.enabled) return;
    this._ensureContext();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (name) {
        case 'tap': {
            // Short percussive click
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 1000; osc.type = 'sine';
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
            break;
        }
        case 'remove': {
            // Swoosh: descending filtered noise + rising tone
            const bufLen = ctx.sampleRate * 0.25;
            const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                const env = Math.pow(1 - i / bufLen, 1.5);
                data[i] = (Math.random() * 2 - 1) * env * 0.5;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);
            filter.Q.value = 2;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.15, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);
            noise.start(now);

            // Rising confirmation tone
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.connect(oscGain); oscGain.connect(ctx.destination);
            osc.frequency.setValueAtTime(600, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
            osc.type = 'sine';
            oscGain.gain.setValueAtTime(0.08, now + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now + 0.05); osc.stop(now + 0.3);
            break;
        }
        case 'wrong': {
            // Low thud + dissonant buzz
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
            osc1.frequency.value = 120; osc1.type = 'sine';
            osc2.frequency.value = 135; osc2.type = 'sine'; // slight detune = dissonance
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc1.start(now); osc1.stop(now + 0.3);
            osc2.start(now); osc2.stop(now + 0.3);
            break;
        }
        case 'combo': {
            // Rising chime - pitch increases with combo count
            const baseFreq = 800;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
            break;
        }
        case 'complete': {
            // Triumphant fanfare: 4-note ascending chord
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = i < 2 ? 'sine' : 'triangle';
                const t = now + i * 0.12;
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.setValueAtTime(0.12, t + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t); osc.stop(t + 0.5);
            });
            break;
        }
    }
}
```

- [ ] **Step 2: Add combo sound trigger in game.js**

In `removePathWithAnimation`, after combo increment, play combo sound when combo > 1:

```js
// After: this.combo++;
if (this.combo > 1) sound.play('combo');
```

- [ ] **Step 3: Test all sounds**

Open browser, play a level:
- Tap arrow: short click
- Remove correct arrow: swoosh + rising tone
- Remove 2nd correct in a row: swoosh + combo chime
- Tap wrong arrow: low thud + buzz
- Complete level: ascending fanfare

- [ ] **Step 4: Commit**

```bash
git add js/sound.js js/game.js
git commit -m "feat: redesign sounds - swoosh, combo chime, thud, fanfare"
```

---

### Task 4: Integration Test & Polish

**Files:**
- All modified files from Tasks 1-3

- [ ] **Step 1: Full playthrough test**

Play through Egypt chapter (5 levels). Verify:
- Snake animation works smoothly for 1-cell, 3-cell, and 5-cell arrows
- Combo counter increments and resets correctly
- Score appears and accumulates
- Timer runs
- Stars show on completion (3 stars if no mistakes)
- Sounds play at correct moments
- No console errors

- [ ] **Step 2: Test difficulty progression**

Play level 1 of Ch1 (Egypt) and Ch5 (Ottoman):
- Ch1: Most arrows should be obviously removable from the start
- Ch5: Should require thinking and chain-solving

- [ ] **Step 3: Fix any issues found**

Address any bugs from testing.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: gameplay overhaul - snake anim, difficulty balance, new sounds"
```
