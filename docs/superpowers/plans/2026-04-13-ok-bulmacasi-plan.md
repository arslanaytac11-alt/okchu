# Ok Bulmacasi - Antik Yolculuk: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based arrow puzzle game where players remove directional arrows from a grid in the correct order, progressing through 10 ancient civilization-themed chapters.

**Architecture:** Single-page HTML5 application using Canvas API for game rendering and DOM for UI screens. Game state managed via a central Game class, levels defined as JSON data, progress persisted in LocalStorage. No build tools - vanilla JS with ES modules loaded via `<script type="module">`.

**Tech Stack:** HTML5, CSS3, JavaScript (ES Modules), Canvas API, LocalStorage

---

## File Structure

```
ok-oyunu/
├── index.html              # Single page - canvas + UI overlay containers
├── css/
│   └── style.css           # All styles: menus, overlays, responsive layout
├── js/
│   ├── main.js             # Entry point: init game, wire up screens
│   ├── arrow.js            # Arrow class: position, direction, state
│   ├── grid.js             # Grid class: arrow placement, neighbor checks, path validation
│   ├── renderer.js         # Canvas drawing: grid, arrows, animations, backgrounds
│   ├── game.js             # Game class: level lifecycle, input handling, win/lose logic
│   ├── lives.js            # Lives manager: count, timer regeneration, localStorage sync
│   ├── hints.js            # Hint system: free hint tracking, solvable arrow finder
│   ├── storage.js          # LocalStorage wrapper: progress, lives, hints
│   ├── screens.js          # DOM screen management: menu, chapter select, level select
│   ├── levels.js           # Level registry: loads all level data, provides by id
│   └── data/
│       ├── chapters.js     # Chapter metadata: names, themes, colors, unlock order
│       └── levels/
│           ├── egypt.js    # Chapter 1: 5 levels
│           ├── greek.js    # Chapter 2: 5 levels
│           └── rome.js     # Chapter 3: 5 levels (chapters 4-10 added later)
├── assets/
│   └── backgrounds/        # Leonardo.ai generated textures (added manually later)
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-13-ok-bulmacasi-design.md
        └── plans/
            └── 2026-04-13-ok-bulmacasi-plan.md
```

**Note:** Only chapters 1-3 (15 levels) are built in this plan. Chapters 4-10 follow the same pattern and are added after core gameplay is validated.

---

### Task 1: Project Skeleton and HTML Structure

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js`

- [ ] **Step 1: Create index.html with canvas and UI containers**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Ok Bulmacasi - Antik Yolculuk</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="app">
        <!-- Menu Screen -->
        <div id="screen-menu" class="screen active">
            <h1 class="game-title">Ok Bulmacasi</h1>
            <p class="game-subtitle">Antik Yolculuk</p>
            <button id="btn-play" class="btn btn-primary">Oyna</button>
        </div>

        <!-- Chapter Select Screen -->
        <div id="screen-chapters" class="screen">
            <div class="screen-header">
                <button class="btn-back" id="btn-chapters-back">&larr;</button>
                <h2>Bolumler</h2>
            </div>
            <div id="chapter-list" class="chapter-list"></div>
        </div>

        <!-- Level Select Screen -->
        <div id="screen-levels" class="screen">
            <div class="screen-header">
                <button class="btn-back" id="btn-levels-back">&larr;</button>
                <h2 id="level-screen-title">Seviyeler</h2>
            </div>
            <div id="level-list" class="level-list"></div>
        </div>

        <!-- Game Screen -->
        <div id="screen-game" class="screen">
            <div class="game-header">
                <button class="btn-back" id="btn-game-back">&larr;</button>
                <div class="level-info">
                    <span id="level-name">Seviye 1</span>
                    <span id="level-difficulty" class="difficulty-badge">Kolay</span>
                </div>
                <button id="btn-hint" class="btn-hint" title="Ipucu">?</button>
            </div>
            <div id="lives-display" class="lives-display"></div>
            <canvas id="game-canvas"></canvas>
        </div>

        <!-- Level Complete Overlay -->
        <div id="overlay-complete" class="overlay hidden">
            <div class="overlay-content">
                <h2>Tebrikler!</h2>
                <p id="complete-message">Seviyeyi tamamladin!</p>
                <button id="btn-next-level" class="btn btn-primary">Sonraki Seviye</button>
            </div>
        </div>

        <!-- Lives Empty Overlay -->
        <div id="overlay-no-lives" class="overlay hidden">
            <div class="overlay-content">
                <h2>Canin Bitti!</h2>
                <p id="lives-timer-text">Yeni can: --:--</p>
                <button id="btn-watch-ad" class="btn btn-primary">Reklam Izle (+1 Can)</button>
                <button id="btn-wait" class="btn btn-secondary">Bekle</button>
            </div>
        </div>
    </div>

    <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create base CSS with mobile-first responsive layout**

```css
/* css/style.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Georgia', 'Times New Roman', serif;
    background: #f5f0e1;
    color: #3a2e1f;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

#app {
    width: 100%;
    height: 100%;
    position: relative;
}

/* Screens */
.screen {
    display: none;
    width: 100%;
    height: 100%;
    flex-direction: column;
    align-items: center;
}

.screen.active {
    display: flex;
}

/* Menu Screen */
#screen-menu {
    justify-content: center;
    gap: 20px;
    background: linear-gradient(180deg, #f5f0e1 0%, #e8dcc8 100%);
}

.game-title {
    font-size: 2.5rem;
    color: #5c3d2e;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.game-subtitle {
    font-size: 1.2rem;
    color: #8b7355;
    margin-top: -10px;
}

/* Buttons */
.btn {
    padding: 14px 40px;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
}

.btn:active {
    transform: scale(0.96);
}

.btn-primary {
    background: #8b5e3c;
    color: #fff;
    box-shadow: 0 4px 8px rgba(139,94,60,0.3);
}

.btn-secondary {
    background: transparent;
    color: #8b5e3c;
    border: 2px solid #8b5e3c;
}

.btn-back {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #5c3d2e;
    cursor: pointer;
    padding: 8px;
}

/* Screen Header */
.screen-header {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 12px;
    border-bottom: 1px solid #d4c5a9;
}

.screen-header h2 {
    font-size: 1.3rem;
    color: #5c3d2e;
}

/* Chapter List */
.chapter-list {
    width: 100%;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.chapter-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    cursor: pointer;
    transition: transform 0.1s;
    gap: 16px;
}

.chapter-card:active {
    transform: scale(0.98);
}

.chapter-card.locked {
    opacity: 0.5;
    cursor: not-allowed;
}

.chapter-number {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: #fff;
}

.chapter-info {
    flex: 1;
}

.chapter-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: #3a2e1f;
}

.chapter-difficulty {
    font-size: 0.85rem;
    color: #8b7355;
}

.chapter-lock-icon {
    font-size: 1.3rem;
    color: #aaa;
}

/* Level List */
.level-list {
    width: 100%;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    justify-items: center;
}

.level-card {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.1s;
}

.level-card.completed {
    background: #6b9b6b;
    color: #fff;
}

.level-card.current {
    background: #8b5e3c;
    color: #fff;
}

.level-card.locked {
    background: #ddd;
    color: #aaa;
    cursor: not-allowed;
}

/* Game Screen */
.game-header {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    justify-content: space-between;
}

.level-info {
    display: flex;
    flex-direction: column;
    align-items: center;
}

#level-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: #5c3d2e;
}

.difficulty-badge {
    font-size: 0.75rem;
    color: #c0392b;
}

.btn-hint {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #8b5e3c;
    background: transparent;
    color: #8b5e3c;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
}

.lives-display {
    display: flex;
    gap: 6px;
    padding: 0 16px 8px;
}

.life-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    transition: background 0.3s;
}

.life-icon.alive {
    background: #e74c3c;
}

.life-icon.dead {
    background: #ccc;
}

#game-canvas {
    width: 100%;
    flex: 1;
}

/* Overlays */
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.overlay.hidden {
    display: none;
}

.overlay-content {
    background: #fff;
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    max-width: 320px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.overlay-content h2 {
    color: #5c3d2e;
}
```

- [ ] **Step 3: Create main.js entry point (empty shell)**

```javascript
// js/main.js
console.log('Ok Bulmacasi - Antik Yolculuk loaded');
```

- [ ] **Step 4: Open index.html in browser to verify layout**

Open `index.html` directly in Chrome/Edge. You should see:
- Cream background with "Ok Bulmacasi" title and "Oyna" button centered on screen.
- All other screens hidden.

- [ ] **Step 5: Commit**

```bash
git init
git add index.html css/style.css js/main.js
git commit -m "feat: project skeleton with HTML structure and base CSS"
```

---

### Task 2: Arrow Class

**Files:**
- Create: `js/arrow.js`

- [ ] **Step 1: Create Arrow class with direction, position, and state**

```javascript
// js/arrow.js

export const Direction = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

export const ArrowState = {
    IDLE: 'idle',
    REMOVABLE: 'removable',
    REMOVING: 'removing',
    REMOVED: 'removed'
};

export class Arrow {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.state = ArrowState.IDLE;
        this.animProgress = 0; // 0 to 1 for removal animation
    }

    getDirectionVector() {
        switch (this.direction) {
            case Direction.UP: return { dx: 0, dy: -1 };
            case Direction.DOWN: return { dx: 0, dy: 1 };
            case Direction.LEFT: return { dx: -1, dy: 0 };
            case Direction.RIGHT: return { dx: 1, dy: 0 };
        }
    }

    isRemoved() {
        return this.state === ArrowState.REMOVED;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/arrow.js
git commit -m "feat: Arrow class with direction and state"
```

---

### Task 3: Grid Class - Core Path Validation Logic

**Files:**
- Create: `js/grid.js`

This is the core game logic. A grid holds arrows. An arrow is removable if the path from its position to the grid edge (in the arrow's direction) contains no other non-removed arrows.

- [ ] **Step 1: Create Grid class with arrow placement and path checking**

```javascript
// js/grid.js

import { Arrow, ArrowState, Direction } from './arrow.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.arrows = [];
    }

    addArrow(x, y, direction) {
        const arrow = new Arrow(x, y, direction);
        this.arrows.push(arrow);
        return arrow;
    }

    getArrowAt(x, y) {
        return this.arrows.find(a => a.x === x && a.y === y && !a.isRemoved()) || null;
    }

    isPathClear(arrow) {
        if (arrow.isRemoved()) return false;

        const { dx, dy } = arrow.getDirectionVector();
        let cx = arrow.x + dx;
        let cy = arrow.y + dy;

        while (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            if (this.getArrowAt(cx, cy)) {
                return false;
            }
            cx += dx;
            cy += dy;
        }

        return true;
    }

    updateRemovableStates() {
        for (const arrow of this.arrows) {
            if (arrow.isRemoved() || arrow.state === ArrowState.REMOVING) continue;
            arrow.state = this.isPathClear(arrow) ? ArrowState.REMOVABLE : ArrowState.IDLE;
        }
    }

    removeArrow(arrow) {
        arrow.state = ArrowState.REMOVING;
    }

    finalizeRemoval(arrow) {
        arrow.state = ArrowState.REMOVED;
        this.updateRemovableStates();
    }

    getActiveArrows() {
        return this.arrows.filter(a => !a.isRemoved());
    }

    isCleared() {
        return this.getActiveArrows().length === 0;
    }

    getRemovableArrows() {
        return this.arrows.filter(a => a.state === ArrowState.REMOVABLE);
    }

    loadFromData(arrowData) {
        this.arrows = [];
        for (const data of arrowData) {
            this.addArrow(data.x, data.y, data.direction);
        }
        this.updateRemovableStates();
    }
}
```

- [ ] **Step 2: Test grid logic manually in browser console**

Add temporary test code to `js/main.js`:

```javascript
// js/main.js
import { Grid } from './grid.js';
import { Direction } from './arrow.js';

// Test: 3x3 grid, arrow at (1,0) pointing UP should be removable
const grid = new Grid(3, 3);
grid.addArrow(1, 0, Direction.UP);
grid.addArrow(1, 1, Direction.DOWN);
grid.addArrow(1, 2, Direction.RIGHT);
grid.updateRemovableStates();

console.log('Arrow (1,0) UP removable:', grid.arrows[0].state); // should be 'removable'
console.log('Arrow (1,1) DOWN removable:', grid.arrows[1].state); // should be 'idle' (blocked by arrow at 1,2)
console.log('Arrow (1,2) RIGHT removable:', grid.arrows[2].state); // should be 'removable'

// Remove (1,0), then check (1,1)
grid.finalizeRemoval(grid.arrows[0]);
console.log('After removing (1,0):');
console.log('Arrow (1,1) DOWN removable:', grid.arrows[1].state); // should still be 'idle'

// Remove (1,2), then check (1,1)
grid.finalizeRemoval(grid.arrows[2]);
console.log('After removing (1,2):');
console.log('Arrow (1,1) DOWN removable:', grid.arrows[1].state); // should be 'removable'
console.log('Grid cleared:', grid.isCleared()); // false

grid.finalizeRemoval(grid.arrows[1]);
console.log('Grid cleared:', grid.isCleared()); // true
```

Open browser, check console output matches expected values.

- [ ] **Step 3: Commit**

```bash
git add js/grid.js js/main.js
git commit -m "feat: Grid class with path validation logic"
```

---

### Task 4: Canvas Renderer - Draw Grid and Arrows

**Files:**
- Create: `js/renderer.js`

- [ ] **Step 1: Create Renderer class that draws grid and arrows on canvas**

```javascript
// js/renderer.js

import { ArrowState } from './arrow.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 40;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.theme = {
            background: '#f5f0e1',
            gridDot: '#d4c5a9',
            arrowIdle: '#7a5c3e',
            arrowRemovable: '#5c3d2e',
            arrowRemoving: '#c0392b',
            removedDot: '#e0d5c0',
            arrowLineWidth: 3,
            arrowHeadSize: 10
        };
    }

    resize(gridWidth, gridHeight) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        const maxCellW = (rect.width - 40) / gridWidth;
        const maxCellH = (rect.height - 40) / gridHeight;
        this.cellSize = Math.floor(Math.min(maxCellW, maxCellH, 50));

        const totalW = this.cellSize * gridWidth;
        const totalH = this.cellSize * gridHeight;
        this.gridOffsetX = (rect.width - totalW) / 2;
        this.gridOffsetY = (rect.height - totalH) / 2;
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = this.theme.background;
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }

    drawGrid(grid) {
        this.clear();
        this.drawGridDots(grid);
        for (const arrow of grid.arrows) {
            if (arrow.state === ArrowState.REMOVED) {
                this.drawRemovedCell(arrow);
            } else {
                this.drawArrow(arrow);
            }
        }
    }

    drawGridDots(grid) {
        const ctx = this.ctx;
        ctx.fillStyle = this.theme.gridDot;
        for (let x = 0; x <= grid.width; x++) {
            for (let y = 0; y <= grid.height; y++) {
                const px = this.gridOffsetX + x * this.cellSize;
                const py = this.gridOffsetY + y * this.cellSize;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawRemovedCell(arrow) {
        const ctx = this.ctx;
        const cx = this.gridOffsetX + arrow.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + arrow.y * this.cellSize + this.cellSize / 2;
        ctx.fillStyle = this.theme.removedDot;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawArrow(arrow) {
        const ctx = this.ctx;
        const cx = this.gridOffsetX + arrow.x * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + arrow.y * this.cellSize + this.cellSize / 2;
        const halfLen = this.cellSize * 0.35;
        const headSize = this.theme.arrowHeadSize;

        let color;
        switch (arrow.state) {
            case ArrowState.REMOVABLE:
                color = this.theme.arrowRemovable;
                break;
            case ArrowState.REMOVING:
                color = this.theme.arrowRemoving;
                break;
            default:
                color = this.theme.arrowIdle;
        }

        const { dx, dy } = arrow.getDirectionVector();
        const startX = cx - dx * halfLen;
        const startY = cy - dy * halfLen;
        const endX = cx + dx * halfLen;
        const endY = cy + dy * halfLen;

        ctx.strokeStyle = color;
        ctx.lineWidth = this.theme.arrowLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Arrow line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = color;
        ctx.beginPath();
        if (dx !== 0) {
            // Horizontal arrow
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - dx * headSize, endY - headSize / 2);
            ctx.lineTo(endX - dx * headSize, endY + headSize / 2);
        } else {
            // Vertical arrow
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headSize / 2, endY - dy * headSize);
            ctx.lineTo(endX + headSize / 2, endY - dy * headSize);
        }
        ctx.closePath();
        ctx.fill();
    }

    getCellFromPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const gridX = Math.floor((x - this.gridOffsetX) / this.cellSize);
        const gridY = Math.floor((y - this.gridOffsetY) / this.cellSize);

        return { gridX, gridY };
    }

    setTheme(theme) {
        Object.assign(this.theme, theme);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer.js
git commit -m "feat: Canvas renderer for grid and arrows"
```

---

### Task 5: Level Data - Chapter Metadata and First 15 Levels

**Files:**
- Create: `js/data/chapters.js`
- Create: `js/data/levels/egypt.js`
- Create: `js/data/levels/greek.js`
- Create: `js/data/levels/rome.js`
- Create: `js/levels.js`

- [ ] **Step 1: Create chapter metadata**

```javascript
// js/data/chapters.js

export const chapters = [
    {
        id: 1,
        name: 'Misir',
        difficulty: 'Cok Kolay',
        theme: {
            background: '#f5e6c8',
            gridDot: '#d4b896',
            arrowIdle: '#8b6914',
            arrowRemovable: '#5c4a0e',
            arrowRemoving: '#c0392b',
            removedDot: '#e8d5b0'
        }
    },
    {
        id: 2,
        name: 'Yunan',
        difficulty: 'Kolay',
        theme: {
            background: '#e8eef5',
            gridDot: '#b0c4de',
            arrowIdle: '#4a6fa5',
            arrowRemovable: '#2c3e6b',
            arrowRemoving: '#c0392b',
            removedDot: '#d0daea'
        }
    },
    {
        id: 3,
        name: 'Roma',
        difficulty: 'Kolay-Orta',
        theme: {
            background: '#f0e6dc',
            gridDot: '#c4a882',
            arrowIdle: '#8b4513',
            arrowRemovable: '#5c2e0e',
            arrowRemoving: '#c0392b',
            removedDot: '#ddd0c0'
        }
    },
    {
        id: 4,
        name: 'Viking',
        difficulty: 'Orta',
        theme: {
            background: '#dde3e8',
            gridDot: '#9aabb8',
            arrowIdle: '#3e5c6b',
            arrowRemovable: '#2a3f4d',
            arrowRemoving: '#c0392b',
            removedDot: '#c8d3dc'
        }
    },
    {
        id: 5,
        name: 'Osmanli',
        difficulty: 'Orta',
        theme: {
            background: '#f2e6e9',
            gridDot: '#c9a0a8',
            arrowIdle: '#8b1a2b',
            arrowRemovable: '#5c1120',
            arrowRemoving: '#e74c3c',
            removedDot: '#e0d0d5'
        }
    },
    {
        id: 6,
        name: 'Cin',
        difficulty: 'Orta-Zor',
        theme: {
            background: '#f5e8e0',
            gridDot: '#d4a888',
            arrowIdle: '#b22222',
            arrowRemovable: '#8b0000',
            arrowRemoving: '#ff4444',
            removedDot: '#e8d5c8'
        }
    },
    {
        id: 7,
        name: 'Maya',
        difficulty: 'Zor',
        theme: {
            background: '#e0eadc',
            gridDot: '#98b08a',
            arrowIdle: '#3d6b35',
            arrowRemovable: '#2a4d25',
            arrowRemoving: '#c0392b',
            removedDot: '#ccdcc5'
        }
    },
    {
        id: 8,
        name: 'Hint',
        difficulty: 'Zor',
        theme: {
            background: '#f5eae0',
            gridDot: '#d4a870',
            arrowIdle: '#cc5500',
            arrowRemovable: '#993d00',
            arrowRemoving: '#c0392b',
            removedDot: '#e8d8c0'
        }
    },
    {
        id: 9,
        name: 'Ortacag Avrupa',
        difficulty: 'Cok Zor',
        theme: {
            background: '#e0ddd8',
            gridDot: '#a09890',
            arrowIdle: '#555555',
            arrowRemovable: '#333333',
            arrowRemoving: '#c0392b',
            removedDot: '#ccc8c0'
        }
    },
    {
        id: 10,
        name: 'Final',
        difficulty: 'Uzman',
        theme: {
            background: '#f0ece0',
            gridDot: '#c0b8a0',
            arrowIdle: '#5c3d2e',
            arrowRemovable: '#3a2510',
            arrowRemoving: '#c0392b',
            removedDot: '#ddd5c5'
        }
    }
];
```

- [ ] **Step 2: Create Egypt levels (Chapter 1 - Very Easy, 5x5 grids)**

Each level's arrows form a shape and have a valid solution (an order in which all arrows can be removed).

```javascript
// js/data/levels/egypt.js

export const egyptLevels = [
    {
        id: 'egypt_1',
        chapter: 1,
        level: 1,
        name: 'Seviye 1',
        gridWidth: 5,
        gridHeight: 5,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'left' },
            { x: 3, y: 1, direction: 'right' },
            { x: 2, y: 2, direction: 'down' }
        ]
    },
    {
        id: 'egypt_2',
        chapter: 1,
        level: 2,
        name: 'Seviye 2',
        gridWidth: 5,
        gridHeight: 5,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'up' },
            { x: 3, y: 1, direction: 'up' },
            { x: 0, y: 2, direction: 'left' },
            { x: 4, y: 2, direction: 'right' },
            { x: 2, y: 2, direction: 'down' }
        ]
    },
    {
        id: 'egypt_3',
        chapter: 1,
        level: 3,
        name: 'Seviye 3',
        gridWidth: 5,
        gridHeight: 5,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'left' },
            { x: 2, y: 1, direction: 'up' },
            { x: 3, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 2, y: 2, direction: 'down' },
            { x: 4, y: 2, direction: 'right' },
            { x: 1, y: 3, direction: 'down' },
            { x: 3, y: 3, direction: 'down' }
        ]
    },
    {
        id: 'egypt_4',
        chapter: 1,
        level: 4,
        name: 'Seviye 4',
        gridWidth: 5,
        gridHeight: 5,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'left' },
            { x: 3, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 1, y: 2, direction: 'down' },
            { x: 3, y: 2, direction: 'down' },
            { x: 4, y: 2, direction: 'right' },
            { x: 0, y: 3, direction: 'down' },
            { x: 2, y: 3, direction: 'down' },
            { x: 4, y: 3, direction: 'down' }
        ]
    },
    {
        id: 'egypt_5',
        chapter: 1,
        level: 5,
        name: 'Seviye 5',
        gridWidth: 5,
        gridHeight: 5,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'up' },
            { x: 3, y: 1, direction: 'up' },
            { x: 0, y: 2, direction: 'left' },
            { x: 1, y: 2, direction: 'left' },
            { x: 2, y: 2, direction: 'right' },
            { x: 3, y: 2, direction: 'right' },
            { x: 4, y: 2, direction: 'right' },
            { x: 1, y: 3, direction: 'down' },
            { x: 2, y: 3, direction: 'down' },
            { x: 3, y: 3, direction: 'down' },
            { x: 2, y: 4, direction: 'down' }
        ]
    }
];
```

- [ ] **Step 3: Create Greek levels (Chapter 2 - Easy, 6x6 grids)**

```javascript
// js/data/levels/greek.js

export const greekLevels = [
    {
        id: 'greek_1',
        chapter: 2,
        level: 1,
        name: 'Seviye 1',
        gridWidth: 6,
        gridHeight: 6,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 3, y: 0, direction: 'up' },
            { x: 2, y: 1, direction: 'left' },
            { x: 3, y: 1, direction: 'right' },
            { x: 2, y: 2, direction: 'left' },
            { x: 3, y: 2, direction: 'right' },
            { x: 2, y: 3, direction: 'down' },
            { x: 3, y: 3, direction: 'down' }
        ]
    },
    {
        id: 'greek_2',
        chapter: 2,
        level: 2,
        name: 'Seviye 2',
        gridWidth: 6,
        gridHeight: 6,
        arrows: [
            { x: 1, y: 0, direction: 'up' },
            { x: 4, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 1, y: 1, direction: 'up' },
            { x: 4, y: 1, direction: 'up' },
            { x: 5, y: 1, direction: 'right' },
            { x: 0, y: 3, direction: 'left' },
            { x: 5, y: 3, direction: 'right' },
            { x: 1, y: 4, direction: 'down' },
            { x: 4, y: 4, direction: 'down' },
            { x: 2, y: 5, direction: 'down' },
            { x: 3, y: 5, direction: 'down' }
        ]
    },
    {
        id: 'greek_3',
        chapter: 2,
        level: 3,
        name: 'Seviye 3',
        gridWidth: 6,
        gridHeight: 6,
        arrows: [
            { x: 0, y: 0, direction: 'up' },
            { x: 5, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 2, y: 1, direction: 'up' },
            { x: 3, y: 1, direction: 'up' },
            { x: 5, y: 1, direction: 'right' },
            { x: 1, y: 2, direction: 'left' },
            { x: 4, y: 2, direction: 'right' },
            { x: 1, y: 3, direction: 'left' },
            { x: 4, y: 3, direction: 'right' },
            { x: 2, y: 4, direction: 'down' },
            { x: 3, y: 4, direction: 'down' },
            { x: 0, y: 5, direction: 'down' },
            { x: 5, y: 5, direction: 'down' }
        ]
    },
    {
        id: 'greek_4',
        chapter: 2,
        level: 4,
        name: 'Seviye 4',
        gridWidth: 6,
        gridHeight: 6,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 3, y: 0, direction: 'right' },
            { x: 0, y: 1, direction: 'left' },
            { x: 1, y: 1, direction: 'up' },
            { x: 4, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 2, y: 2, direction: 'down' },
            { x: 3, y: 2, direction: 'right' },
            { x: 5, y: 2, direction: 'right' },
            { x: 1, y: 3, direction: 'down' },
            { x: 4, y: 3, direction: 'down' },
            { x: 2, y: 4, direction: 'down' },
            { x: 3, y: 4, direction: 'down' },
            { x: 5, y: 4, direction: 'down' }
        ]
    },
    {
        id: 'greek_5',
        chapter: 2,
        level: 5,
        name: 'Seviye 5',
        gridWidth: 6,
        gridHeight: 6,
        arrows: [
            { x: 1, y: 0, direction: 'up' },
            { x: 2, y: 0, direction: 'up' },
            { x: 3, y: 0, direction: 'up' },
            { x: 4, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 5, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 2, y: 2, direction: 'left' },
            { x: 3, y: 2, direction: 'right' },
            { x: 5, y: 2, direction: 'right' },
            { x: 0, y: 3, direction: 'left' },
            { x: 5, y: 3, direction: 'right' },
            { x: 1, y: 4, direction: 'down' },
            { x: 4, y: 4, direction: 'down' },
            { x: 1, y: 5, direction: 'down' },
            { x: 2, y: 5, direction: 'down' },
            { x: 3, y: 5, direction: 'down' },
            { x: 4, y: 5, direction: 'down' }
        ]
    }
];
```

- [ ] **Step 4: Create Rome levels (Chapter 3 - Easy-Medium, 7x7 grids)**

```javascript
// js/data/levels/rome.js

export const romeLevels = [
    {
        id: 'rome_1',
        chapter: 3,
        level: 1,
        name: 'Seviye 1',
        gridWidth: 7,
        gridHeight: 7,
        arrows: [
            { x: 3, y: 0, direction: 'up' },
            { x: 3, y: 1, direction: 'up' },
            { x: 2, y: 2, direction: 'left' },
            { x: 3, y: 2, direction: 'up' },
            { x: 4, y: 2, direction: 'right' },
            { x: 1, y: 3, direction: 'left' },
            { x: 3, y: 3, direction: 'right' },
            { x: 5, y: 3, direction: 'right' },
            { x: 2, y: 4, direction: 'down' },
            { x: 4, y: 4, direction: 'down' },
            { x: 3, y: 5, direction: 'down' },
            { x: 3, y: 6, direction: 'down' }
        ]
    },
    {
        id: 'rome_2',
        chapter: 3,
        level: 2,
        name: 'Seviye 2',
        gridWidth: 7,
        gridHeight: 7,
        arrows: [
            { x: 0, y: 0, direction: 'up' },
            { x: 6, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 3, y: 1, direction: 'up' },
            { x: 6, y: 1, direction: 'right' },
            { x: 1, y: 2, direction: 'left' },
            { x: 5, y: 2, direction: 'right' },
            { x: 2, y: 3, direction: 'left' },
            { x: 3, y: 3, direction: 'down' },
            { x: 4, y: 3, direction: 'right' },
            { x: 1, y: 4, direction: 'down' },
            { x: 5, y: 4, direction: 'down' },
            { x: 0, y: 5, direction: 'down' },
            { x: 3, y: 5, direction: 'down' },
            { x: 6, y: 5, direction: 'down' }
        ]
    },
    {
        id: 'rome_3',
        chapter: 3,
        level: 3,
        name: 'Seviye 3',
        gridWidth: 7,
        gridHeight: 7,
        arrows: [
            { x: 2, y: 0, direction: 'up' },
            { x: 3, y: 0, direction: 'up' },
            { x: 4, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 1, y: 1, direction: 'up' },
            { x: 5, y: 1, direction: 'up' },
            { x: 6, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 3, y: 2, direction: 'right' },
            { x: 6, y: 2, direction: 'right' },
            { x: 0, y: 3, direction: 'left' },
            { x: 6, y: 3, direction: 'right' },
            { x: 1, y: 4, direction: 'down' },
            { x: 3, y: 4, direction: 'left' },
            { x: 5, y: 4, direction: 'down' },
            { x: 2, y: 5, direction: 'down' },
            { x: 4, y: 5, direction: 'down' },
            { x: 3, y: 6, direction: 'down' }
        ]
    },
    {
        id: 'rome_4',
        chapter: 3,
        level: 4,
        name: 'Seviye 4',
        gridWidth: 7,
        gridHeight: 7,
        arrows: [
            { x: 1, y: 0, direction: 'up' },
            { x: 3, y: 0, direction: 'up' },
            { x: 5, y: 0, direction: 'up' },
            { x: 0, y: 1, direction: 'left' },
            { x: 2, y: 1, direction: 'up' },
            { x: 4, y: 1, direction: 'up' },
            { x: 6, y: 1, direction: 'right' },
            { x: 0, y: 2, direction: 'left' },
            { x: 1, y: 2, direction: 'left' },
            { x: 5, y: 2, direction: 'right' },
            { x: 6, y: 2, direction: 'right' },
            { x: 2, y: 3, direction: 'down' },
            { x: 3, y: 3, direction: 'left' },
            { x: 4, y: 3, direction: 'right' },
            { x: 0, y: 4, direction: 'left' },
            { x: 6, y: 4, direction: 'right' },
            { x: 1, y: 5, direction: 'down' },
            { x: 3, y: 5, direction: 'down' },
            { x: 5, y: 5, direction: 'down' },
            { x: 2, y: 6, direction: 'down' },
            { x: 4, y: 6, direction: 'down' }
        ]
    },
    {
        id: 'rome_5',
        chapter: 3,
        level: 5,
        name: 'Seviye 5',
        gridWidth: 7,
        gridHeight: 7,
        arrows: [
            { x: 3, y: 0, direction: 'up' },
            { x: 1, y: 1, direction: 'up' },
            { x: 2, y: 1, direction: 'left' },
            { x: 4, y: 1, direction: 'right' },
            { x: 5, y: 1, direction: 'up' },
            { x: 0, y: 2, direction: 'left' },
            { x: 3, y: 2, direction: 'up' },
            { x: 6, y: 2, direction: 'right' },
            { x: 0, y: 3, direction: 'left' },
            { x: 1, y: 3, direction: 'down' },
            { x: 2, y: 3, direction: 'left' },
            { x: 4, y: 3, direction: 'right' },
            { x: 5, y: 3, direction: 'down' },
            { x: 6, y: 3, direction: 'right' },
            { x: 0, y: 4, direction: 'left' },
            { x: 3, y: 4, direction: 'down' },
            { x: 6, y: 4, direction: 'right' },
            { x: 1, y: 5, direction: 'down' },
            { x: 5, y: 5, direction: 'down' },
            { x: 2, y: 6, direction: 'down' },
            { x: 3, y: 6, direction: 'down' },
            { x: 4, y: 6, direction: 'down' }
        ]
    }
];
```

- [ ] **Step 5: Create level registry**

```javascript
// js/levels.js

import { egyptLevels } from './data/levels/egypt.js';
import { greekLevels } from './data/levels/greek.js';
import { romeLevels } from './data/levels/rome.js';

const allLevels = [
    ...egyptLevels,
    ...greekLevels,
    ...romeLevels
];

export function getLevelsByChapter(chapterId) {
    return allLevels.filter(l => l.chapter === chapterId);
}

export function getLevelById(id) {
    return allLevels.find(l => l.id === id) || null;
}

export function getNextLevel(currentId) {
    const idx = allLevels.findIndex(l => l.id === currentId);
    if (idx === -1 || idx === allLevels.length - 1) return null;
    return allLevels[idx + 1];
}
```

- [ ] **Step 6: Commit**

```bash
git add js/data/chapters.js js/data/levels/egypt.js js/data/levels/greek.js js/data/levels/rome.js js/levels.js
git commit -m "feat: chapter metadata and 15 levels for chapters 1-3"
```

---

### Task 6: Storage Manager - LocalStorage Persistence

**Files:**
- Create: `js/storage.js`

- [ ] **Step 1: Create storage wrapper for progress, lives, and hints**

```javascript
// js/storage.js

const STORAGE_KEY = 'ok_bulmacasi_save';

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    try {
        return JSON.parse(raw);
    } catch {
        return getDefaultData();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaultData() {
    return {
        completedLevels: [],
        unlockedChapters: [1],
        lives: 3,
        lastLifeLostTime: null,
        freeHintsUsed: []
    };
}

export const storage = {
    getProgress() {
        return loadData();
    },

    completeLevel(levelId, chapterId) {
        const data = loadData();
        if (!data.completedLevels.includes(levelId)) {
            data.completedLevels.push(levelId);
        }
        const nextChapter = chapterId + 1;
        if (nextChapter <= 10 && !data.unlockedChapters.includes(nextChapter)) {
            const chapterLevels = data.completedLevels.filter(id => id.startsWith(this.getChapterPrefix(chapterId)));
            if (chapterLevels.length >= 5) {
                data.unlockedChapters.push(nextChapter);
            }
        }
        saveData(data);
    },

    getChapterPrefix(chapterId) {
        const prefixes = {
            1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
            6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final'
        };
        return prefixes[chapterId] || '';
    },

    isLevelCompleted(levelId) {
        return loadData().completedLevels.includes(levelId);
    },

    isChapterUnlocked(chapterId) {
        return loadData().unlockedChapters.includes(chapterId);
    },

    getLives() {
        const data = loadData();
        if (data.lives < 3 && data.lastLifeLostTime) {
            const elapsed = Date.now() - data.lastLifeLostTime;
            const regenInterval = 20 * 60 * 1000; // 20 minutes
            const livesRegened = Math.floor(elapsed / regenInterval);
            if (livesRegened > 0) {
                data.lives = Math.min(3, data.lives + livesRegened);
                data.lastLifeLostTime = livesRegened >= (3 - data.lives)
                    ? null
                    : data.lastLifeLostTime + livesRegened * regenInterval;
                saveData(data);
            }
        }
        return data.lives;
    },

    loseLife() {
        const data = loadData();
        data.lives = Math.max(0, data.lives - 1);
        if (!data.lastLifeLostTime) {
            data.lastLifeLostTime = Date.now();
        }
        saveData(data);
        return data.lives;
    },

    addLife() {
        const data = loadData();
        data.lives = Math.min(3, data.lives + 1);
        if (data.lives >= 3) {
            data.lastLifeLostTime = null;
        }
        saveData(data);
        return data.lives;
    },

    getTimeUntilNextLife() {
        const data = loadData();
        if (data.lives >= 3 || !data.lastLifeLostTime) return 0;
        const elapsed = Date.now() - data.lastLifeLostTime;
        const regenInterval = 20 * 60 * 1000;
        const timeInCurrentCycle = elapsed % regenInterval;
        return regenInterval - timeInCurrentCycle;
    },

    isFreeHintUsed(levelId) {
        return loadData().freeHintsUsed.includes(levelId);
    },

    useFreeHint(levelId) {
        const data = loadData();
        if (!data.freeHintsUsed.includes(levelId)) {
            data.freeHintsUsed.push(levelId);
        }
        saveData(data);
    },

    resetAll() {
        localStorage.removeItem(STORAGE_KEY);
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add js/storage.js
git commit -m "feat: LocalStorage persistence for progress, lives, and hints"
```

---

### Task 7: Lives Manager - UI and Timer

**Files:**
- Create: `js/lives.js`

- [ ] **Step 1: Create lives manager that syncs with storage and updates UI**

```javascript
// js/lives.js

import { storage } from './storage.js';

export class LivesManager {
    constructor() {
        this.lives = storage.getLives();
        this.timerInterval = null;
        this.onLivesChanged = null;
        this.onTimerTick = null;
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.lives = storage.getLives();
            if (this.onLivesChanged) this.onLivesChanged(this.lives);
            if (this.lives >= 3) {
                this.stopTimer();
            }
            if (this.onTimerTick) {
                const remaining = storage.getTimeUntilNextLife();
                this.onTimerTick(remaining);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    loseLife() {
        this.lives = storage.loseLife();
        if (this.onLivesChanged) this.onLivesChanged(this.lives);
        if (this.lives < 3) this.startTimer();
        return this.lives;
    }

    addLife() {
        this.lives = storage.addLife();
        if (this.onLivesChanged) this.onLivesChanged(this.lives);
        return this.lives;
    }

    getCurrentLives() {
        this.lives = storage.getLives();
        return this.lives;
    }

    hasLives() {
        return this.getCurrentLives() > 0;
    }

    renderLives(container) {
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const icon = document.createElement('div');
            icon.className = 'life-icon ' + (i < this.lives ? 'alive' : 'dead');
            container.appendChild(icon);
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/lives.js
git commit -m "feat: Lives manager with timer regeneration"
```

---

### Task 8: Hint System

**Files:**
- Create: `js/hints.js`

- [ ] **Step 1: Create hint system that finds a correct removable arrow**

```javascript
// js/hints.js

import { storage } from './storage.js';

export class HintManager {
    constructor() {
        this.currentLevelId = null;
    }

    setLevel(levelId) {
        this.currentLevelId = levelId;
    }

    hasFreeHint() {
        if (!this.currentLevelId) return false;
        return !storage.isFreeHintUsed(this.currentLevelId);
    }

    useFreeHint() {
        if (!this.currentLevelId) return;
        storage.useFreeHint(this.currentLevelId);
    }

    findHintArrow(grid) {
        const removable = grid.getRemovableArrows();
        if (removable.length === 0) return null;
        // Return a random removable arrow as hint
        return removable[Math.floor(Math.random() * removable.length)];
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/hints.js
git commit -m "feat: Hint system with free hint tracking"
```

---

### Task 9: Screen Manager - Navigation Between Screens

**Files:**
- Create: `js/screens.js`

- [ ] **Step 1: Create screen manager that handles menu, chapter select, and level select**

```javascript
// js/screens.js

import { chapters } from './data/chapters.js';
import { getLevelsByChapter } from './levels.js';
import { storage } from './storage.js';

export class ScreenManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('screen-menu'),
            chapters: document.getElementById('screen-chapters'),
            levels: document.getElementById('screen-levels'),
            game: document.getElementById('screen-game')
        };
        this.onStartLevel = null;
        this.setupNavigation();
    }

    showScreen(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', key === name);
        }
    }

    setupNavigation() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-chapters-back').addEventListener('click', () => {
            this.showScreen('menu');
        });

        document.getElementById('btn-levels-back').addEventListener('click', () => {
            this.showChapters();
        });

        document.getElementById('btn-game-back').addEventListener('click', () => {
            this.showScreen('levels');
        });
    }

    showChapters() {
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        for (const chapter of chapters) {
            const unlocked = storage.isChapterUnlocked(chapter.id);
            const card = document.createElement('div');
            card.className = 'chapter-card' + (unlocked ? '' : ' locked');

            const numDiv = document.createElement('div');
            numDiv.className = 'chapter-number';
            numDiv.style.background = chapter.theme.arrowRemovable;
            numDiv.textContent = chapter.id;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'chapter-info';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'chapter-name';
            nameSpan.textContent = chapter.name;

            const diffSpan = document.createElement('div');
            diffSpan.className = 'chapter-difficulty';
            diffSpan.textContent = chapter.difficulty;

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(diffSpan);

            card.appendChild(numDiv);
            card.appendChild(infoDiv);

            if (!unlocked) {
                const lock = document.createElement('span');
                lock.className = 'chapter-lock-icon';
                lock.textContent = '\u{1F512}';
                card.appendChild(lock);
            }

            if (unlocked) {
                card.addEventListener('click', () => {
                    this.showLevels(chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('chapters');
    }

    showLevels(chapter) {
        document.getElementById('level-screen-title').textContent = chapter.name;
        const list = document.getElementById('level-list');
        list.innerHTML = '';

        const levels = getLevelsByChapter(chapter.id);
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const completed = storage.isLevelCompleted(level.id);
            const prevCompleted = i === 0 || storage.isLevelCompleted(levels[i - 1].id);
            const isAccessible = completed || prevCompleted;

            const card = document.createElement('div');
            card.className = 'level-card';
            if (completed) {
                card.classList.add('completed');
            } else if (isAccessible) {
                card.classList.add('current');
            } else {
                card.classList.add('locked');
            }

            card.textContent = level.level;

            if (isAccessible && this.onStartLevel) {
                card.addEventListener('click', () => {
                    this.onStartLevel(level, chapter);
                });
            }

            list.appendChild(card);
        }

        this.showScreen('levels');
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/screens.js
git commit -m "feat: Screen manager with chapter and level select navigation"
```

---

### Task 10: Game Class - Core Game Loop and Input Handling

**Files:**
- Create: `js/game.js`

- [ ] **Step 1: Create Game class that ties everything together**

```javascript
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
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

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

        // Flash the arrow red briefly
        this.isAnimating = true;
        const origState = arrow.state;
        arrow.state = 'removing'; // red color
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
        if (!hasFree) {
            // Would show ad - for now just return
            return;
        }

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
```

- [ ] **Step 2: Commit**

```bash
git add js/game.js
git commit -m "feat: Game class with input handling, animations, and level lifecycle"
```

---

### Task 11: Wire Everything Together in main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Replace main.js with full app initialization**

```javascript
// js/main.js

import { Game } from './game.js';
import { ScreenManager } from './screens.js';
import { getLevelsByChapter } from './levels.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const screenManager = new ScreenManager();

// Lives display
const livesDisplay = document.getElementById('lives-display');
game.livesManager.renderLives(livesDisplay);
game.livesManager.onLivesChanged = (lives) => {
    game.livesManager.renderLives(livesDisplay);
};

// Start level callback
screenManager.onStartLevel = (levelData, chapterData) => {
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    setTimeout(() => {
        game.startLevel(levelData, chapterData);
    }, 50);
};

// Level complete callback
game.onLevelComplete = (completedLevel, nextLevel) => {
    const overlay = document.getElementById('overlay-complete');
    const nextBtn = document.getElementById('btn-next-level');
    overlay.classList.remove('hidden');

    const handler = () => {
        overlay.classList.add('hidden');
        nextBtn.removeEventListener('click', handler);

        if (nextLevel && nextLevel.chapter === completedLevel.chapter) {
            const { chapters } = await_import_chapters();
            const chapter = chapters.find(c => c.id === nextLevel.chapter);
            game.startLevel(nextLevel, chapter);
        } else {
            screenManager.showChapters();
        }
    };
    nextBtn.addEventListener('click', handler);
};

// Workaround: dynamic import for chapter data in callback
function await_import_chapters() {
    // chapters is already imported via screens.js, access from module scope
    // Re-import here for clarity
    return import('./data/chapters.js');
}

// Fix the level complete callback to handle async
game.onLevelComplete = (completedLevel, nextLevel) => {
    const overlay = document.getElementById('overlay-complete');
    const nextBtn = document.getElementById('btn-next-level');
    overlay.classList.remove('hidden');

    const handler = async () => {
        overlay.classList.add('hidden');
        nextBtn.removeEventListener('click', handler);

        if (nextLevel && nextLevel.chapter === completedLevel.chapter) {
            const { chapters } = await import('./data/chapters.js');
            const chapter = chapters.find(c => c.id === nextLevel.chapter);
            game.startLevel(nextLevel, chapter);
        } else {
            screenManager.showChapters();
        }
    };
    nextBtn.addEventListener('click', handler);
};

// No lives callback
game.onNoLives = () => {
    showNoLivesOverlay();
};

game.onLivesChanged = (lives) => {
    game.livesManager.renderLives(livesDisplay);
};

function showNoLivesOverlay() {
    const overlay = document.getElementById('overlay-no-lives');
    overlay.classList.remove('hidden');

    const timerText = document.getElementById('lives-timer-text');
    const timerInterval = setInterval(() => {
        const remaining = game.livesManager.livesManager
            ? game.livesManager.getTimeUntilNextLife()
            : 0;
        // Use storage directly
        const ms = game.livesManager.constructor === Object
            ? 0
            : (() => {
                const { storage } = game.livesManager;
                return storage ? storage.getTimeUntilNextLife() : 0;
            })();
    }, 1000);

    // Simplified timer update
    const updateTimer = () => {
        import('./storage.js').then(({ storage }) => {
            const ms = storage.getTimeUntilNextLife();
            if (ms <= 0) {
                timerText.textContent = 'Yeni can hazir!';
            } else {
                const totalSec = Math.ceil(ms / 1000);
                const min = Math.floor(totalSec / 60);
                const sec = totalSec % 60;
                timerText.textContent = `Yeni can: ${min}:${sec.toString().padStart(2, '0')}`;
            }
        });
    };
    clearInterval(timerInterval);
    const liveTimer = setInterval(updateTimer, 1000);
    updateTimer();

    // Watch ad button (simulated - adds 1 life)
    const adBtn = document.getElementById('btn-watch-ad');
    const waitBtn = document.getElementById('btn-wait');

    const adHandler = () => {
        game.livesManager.addLife();
        game.livesManager.renderLives(livesDisplay);
        overlay.classList.add('hidden');
        clearInterval(liveTimer);
        cleanup();
    };

    const waitHandler = () => {
        overlay.classList.add('hidden');
        clearInterval(liveTimer);
        screenManager.showChapters();
        cleanup();
    };

    const cleanup = () => {
        adBtn.removeEventListener('click', adHandler);
        waitBtn.removeEventListener('click', waitHandler);
    };

    adBtn.addEventListener('click', adHandler);
    waitBtn.addEventListener('click', waitHandler);
}

// Hint button
document.getElementById('btn-hint').addEventListener('click', () => {
    game.useHint();
});

// Window resize
window.addEventListener('resize', () => {
    game.handleResize();
});

console.log('Ok Bulmacasi - Antik Yolculuk loaded');
```

- [ ] **Step 2: Open in browser, test full flow**

1. Open `index.html` in Chrome
2. Click "Oyna" → should see chapter list with Chapter 1 (Misir) unlocked, rest locked
3. Click Misir → should see 5 level cards, Level 1 active
4. Click Level 1 → should see game canvas with arrows
5. Tap removable arrows → they should animate out
6. Tap blocked arrow → should flash red and lose a life
7. Clear all arrows → should see "Tebrikler!" overlay
8. Click "Sonraki Seviye" → should load Level 2

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: wire up all systems in main.js - full game flow"
```

---

### Task 12: Polish main.js - Clean Up and Fix Issues

**Files:**
- Modify: `js/main.js`

The main.js from Task 11 has some messy code in the `showNoLivesOverlay` function. Clean it up.

- [ ] **Step 1: Rewrite main.js cleanly**

```javascript
// js/main.js

import { Game } from './game.js';
import { ScreenManager } from './screens.js';
import { chapters } from './data/chapters.js';
import { storage } from './storage.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const screenManager = new ScreenManager();
const livesDisplay = document.getElementById('lives-display');

let noLivesTimerInterval = null;

// Render initial lives
game.livesManager.renderLives(livesDisplay);

// When a level is selected from the menu
screenManager.onStartLevel = (levelData, chapterData) => {
    if (!game.livesManager.hasLives()) {
        showNoLivesOverlay();
        return;
    }
    screenManager.showScreen('game');
    game.livesManager.renderLives(livesDisplay);
    setTimeout(() => game.startLevel(levelData, chapterData), 50);
};

// When a level is completed
game.onLevelComplete = (completedLevel, nextLevel) => {
    const overlay = document.getElementById('overlay-complete');
    overlay.classList.remove('hidden');

    const nextBtn = document.getElementById('btn-next-level');
    const handler = () => {
        overlay.classList.add('hidden');
        nextBtn.removeEventListener('click', handler);

        if (nextLevel && nextLevel.chapter === completedLevel.chapter) {
            const chapter = chapters.find(c => c.id === nextLevel.chapter);
            game.startLevel(nextLevel, chapter);
        } else {
            screenManager.showChapters();
        }
    };
    nextBtn.addEventListener('click', handler);
};

// When lives run out
game.onNoLives = () => showNoLivesOverlay();

// When lives change (wrong move)
game.onLivesChanged = () => game.livesManager.renderLives(livesDisplay);

function showNoLivesOverlay() {
    const overlay = document.getElementById('overlay-no-lives');
    const timerText = document.getElementById('lives-timer-text');
    const adBtn = document.getElementById('btn-watch-ad');
    const waitBtn = document.getElementById('btn-wait');

    overlay.classList.remove('hidden');

    // Timer update
    if (noLivesTimerInterval) clearInterval(noLivesTimerInterval);

    const updateTimer = () => {
        const ms = storage.getTimeUntilNextLife();
        if (ms <= 0) {
            timerText.textContent = 'Yeni can hazir!';
        } else {
            timerText.textContent = 'Yeni can: ' + game.livesManager.formatTime(ms);
        }
    };
    updateTimer();
    noLivesTimerInterval = setInterval(updateTimer, 1000);

    const closeOverlay = () => {
        overlay.classList.add('hidden');
        if (noLivesTimerInterval) clearInterval(noLivesTimerInterval);
        adBtn.removeEventListener('click', adHandler);
        waitBtn.removeEventListener('click', waitHandler);
    };

    const adHandler = () => {
        game.livesManager.addLife();
        game.livesManager.renderLives(livesDisplay);
        closeOverlay();
    };

    const waitHandler = () => {
        closeOverlay();
        screenManager.showChapters();
    };

    adBtn.addEventListener('click', adHandler);
    waitBtn.addEventListener('click', waitHandler);
}

// Hint button
document.getElementById('btn-hint').addEventListener('click', () => game.useHint());

// Resize handler
window.addEventListener('resize', () => game.handleResize());
```

- [ ] **Step 2: Test the full game flow again in browser**

Same test as Task 11 Step 2. Verify all screens, arrows, lives, and overlays work.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "refactor: clean up main.js, fix no-lives overlay"
```

---

### Task 13: Responsive Canvas and Mobile Touch Support

**Files:**
- Modify: `js/renderer.js`
- Modify: `css/style.css`

- [ ] **Step 1: Add touch feedback and mobile improvements to renderer**

Add a `drawTouchFeedback` method to `js/renderer.js` after the `drawArrow` method:

```javascript
    drawTouchFeedback(gridX, gridY) {
        const ctx = this.ctx;
        const cx = this.gridOffsetX + gridX * this.cellSize + this.cellSize / 2;
        const cy = this.gridOffsetY + gridY * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.4;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }
```

- [ ] **Step 2: Add mobile-specific CSS**

Append to `css/style.css`:

```css
/* Mobile responsive */
@media (max-width: 480px) {
    .game-title {
        font-size: 2rem;
    }

    .game-subtitle {
        font-size: 1rem;
    }

    .chapter-card {
        padding: 12px;
    }

    .level-card {
        width: 70px;
        height: 70px;
        font-size: 1.3rem;
    }

    .game-header {
        padding: 8px 12px;
    }
}

/* Prevent text selection on game elements */
#app {
    user-select: none;
    -webkit-user-select: none;
}

/* Safe area for notched phones */
@supports (padding-top: env(safe-area-inset-top)) {
    .screen-header,
    .game-header {
        padding-top: calc(12px + env(safe-area-inset-top));
    }
}
```

- [ ] **Step 3: Test on Android phone via local network**

Run a local server:
```bash
npx serve .
```
Open the displayed URL on your Android phone's browser. Test:
- Touch arrows works correctly
- Layout looks good on mobile screen
- No zoom issues on double-tap

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js css/style.css
git commit -m "feat: mobile responsive layout and touch improvements"
```

---

### Task 14: Final Integration Test and Bug Fixes

**Files:**
- Any files needing fixes

- [ ] **Step 1: Full playthrough test checklist**

Test each of these in the browser:

1. Menu screen displays correctly
2. "Oyna" navigates to chapter select
3. Only Chapter 1 is unlocked initially
4. Chapter 1 shows 5 levels, only Level 1 accessible
5. Arrows render on game canvas
6. Tapping removable arrow: animates and removes
7. Tapping blocked arrow: flashes red, loses 1 life
8. Lives display updates after wrong move
9. Hint button highlights a removable arrow
10. Clearing all arrows shows completion overlay
11. "Sonraki Seviye" loads next level
12. Completing all 5 Egypt levels unlocks Chapter 2 (Yunan)
13. Losing all 3 lives shows "Canin Bitti" overlay
14. "Reklam Izle" adds 1 life and closes overlay
15. "Bekle" returns to chapter select
16. Refreshing page preserves progress (localStorage)
17. Back buttons navigate correctly on all screens

- [ ] **Step 2: Fix any bugs found during testing**

Address each bug individually with targeted fixes.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: integration test bug fixes"
```

---

## Plan Self-Review

**Spec coverage check:**
- Game mechanics (grid, arrows, path checking): Task 2, 3, 10
- 10 chapters x 5 levels: Task 5 (chapters 1-3 built, 4-10 metadata defined)
- Locked chapter progression: Task 6, 9
- 3 lives with timed regen: Task 6, 7
- Hint system (1 free per level): Task 8
- Visual themes per chapter: Task 5 (chapter themes defined)
- Monetization (ad placeholder): Task 11/12 (simulated ad button)
- All 6 screens: Task 1 (HTML), Task 9 (navigation), Task 10/11 (game screen)
- Leonardo.ai backgrounds: noted as manual addition (assets/backgrounds/)
- Sound: explicitly out of scope per spec

**Placeholder scan:** No TBDs or TODOs found. All code steps have complete code.

**Type consistency:** Arrow, ArrowState, Direction used consistently. Grid methods match across tasks. Storage API consistent between storage.js and consumers.

**Missing from spec:** Chapters 4-10 level data - intentionally deferred. The pattern is established in chapters 1-3 and adding more levels follows the exact same format.
