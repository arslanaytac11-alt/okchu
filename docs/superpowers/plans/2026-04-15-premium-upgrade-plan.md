# Ok Bulmacasi Premium Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the arrow puzzle game to premium quality through improved puzzle difficulty, polished game engine animations, and cultural visual integration.

**Architecture:** 3-phase approach — (1) rewrite the level generator with new difficulty parameters and cultural shape masks, (2) overhaul the game engine animations/feedback/smoothness, (3) add cultural assets, sound, and menu polish. Each phase produces independently testable results.

**Tech Stack:** Vanilla JavaScript ES6 modules, Canvas 2D API, CSS3, Node.js for level generation

---

## Phase 1: Puzzle Depth

### Task 1: Add difficulty config to level generator

**Files:**
- Modify: `generate-levels.mjs:647-708` (levelSpecs array)

- [ ] **Step 1: Define the difficulty config object per chapter**

Replace the existing `levelSpecs` array with new specs that include `trapRatio`, `chainDepth`, `density`, and `maxPathLen` parameters. Update grid sizes and difficulty labels per the design spec.

```javascript
const CHAPTER_CONFIG = {
    1:  { trapRatio: 0.10, chainDepth: 1, density: 0.30, maxPathLen: 6  },  // Misir - Kolay
    2:  { trapRatio: 0.30, chainDepth: 2, density: 0.40, maxPathLen: 8  },  // Yunan - Orta
    3:  { trapRatio: 0.40, chainDepth: 2, density: 0.45, maxPathLen: 8  },  // Roma - Zor
    4:  { trapRatio: 0.50, chainDepth: 3, density: 0.50, maxPathLen: 10 },  // Viking - Zor+
    5:  { trapRatio: 0.60, chainDepth: 3, density: 0.55, maxPathLen: 10 },  // Osmanli - Cok Zor
    6:  { trapRatio: 0.65, chainDepth: 4, density: 0.60, maxPathLen: 12 },  // Cin - Cok Zor+
    7:  { trapRatio: 0.70, chainDepth: 4, density: 0.65, maxPathLen: 12 },  // Maya - Efsanevi
    8:  { trapRatio: 0.75, chainDepth: 5, density: 0.65, maxPathLen: 12 },  // Hint - Efsanevi+
    9:  { trapRatio: 0.80, chainDepth: 5, density: 0.70, maxPathLen: 14 },  // Ortacag - Kabus
    10: { trapRatio: 0.85, chainDepth: 6, density: 0.75, maxPathLen: 14 },  // Final - Kabus+
};
```

Add this object at the top of `generate-levels.mjs` (after the imports, before shape generators), then update `levelSpecs` to reference these configs and use the new grid sizes from the design spec:

```javascript
const levelSpecs = [
    // CH1: MISIR - Kolay + Ogretici
    { id: 'egypt_1', chapter: 1, level: 1,  name: 'Piramit',   w: 18, h: 14, shape: 'pyramid',     seedStart: 1000 },
    { id: 'egypt_2', chapter: 1, level: 2,  name: 'Sfenks',    w: 18, h: 14, shape: 'sphinx',      seedStart: 2000 },
    { id: 'egypt_3', chapter: 1, level: 3,  name: 'Elmas',     w: 18, h: 14, shape: 'diamond',     seedStart: 3000 },
    { id: 'egypt_4', chapter: 1, level: 4,  name: 'Basamak',   w: 18, h: 14, shape: 'steppyramid', seedStart: 4000 },
    { id: 'egypt_5', chapter: 1, level: 5,  name: 'Firavun',   w: 18, h: 14, shape: 'solidoval',   seedStart: 5000 },

    // CH2: YUNAN - Orta
    { id: 'greek_1', chapter: 2, level: 6,  name: 'Parthenon', w: 20, h: 16, shape: 'temple',      seedStart: 6000 },
    { id: 'greek_2', chapter: 2, level: 7,  name: 'Amphora',   w: 20, h: 16, shape: 'amphora',     seedStart: 7000 },
    { id: 'greek_3', chapter: 2, level: 8,  name: 'Olympia',   w: 20, h: 16, shape: 'diamond',     seedStart: 8000 },
    { id: 'greek_4', chapter: 2, level: 9,  name: 'Akropolis', w: 20, h: 16, shape: 'solidoval',   seedStart: 9000 },
    { id: 'greek_5', chapter: 2, level: 10, name: 'Atina',     w: 20, h: 16, shape: 'steppyramid', seedStart: 10000 },

    // CH3: ROMA - Zor
    { id: 'rome_1', chapter: 3, level: 11, name: 'Kolezyum',   w: 22, h: 18, shape: 'arch',        seedStart: 11000 },
    { id: 'rome_2', chapter: 3, level: 12, name: 'Kartal',     w: 22, h: 18, shape: 'eagle',       seedStart: 12000 },
    { id: 'rome_3', chapter: 3, level: 13, name: 'Su Kemeri',  w: 22, h: 18, shape: 'aqueduct',    seedStart: 13000 },
    { id: 'rome_4', chapter: 3, level: 14, name: 'Arena',      w: 22, h: 18, shape: 'oval4',       seedStart: 14000 },
    { id: 'rome_5', chapter: 3, level: 15, name: 'Sezar',      w: 22, h: 18, shape: 'solidoval',   seedStart: 15000 },

    // CH4: VIKING - Zor+
    { id: 'viking_1', chapter: 4, level: 16, name: 'Drakkar',   w: 26, h: 20, shape: 'ship',       seedStart: 16000 },
    { id: 'viking_2', chapter: 4, level: 17, name: 'Mjolnir',   w: 26, h: 20, shape: 'hammer',     seedStart: 17000 },
    { id: 'viking_3', chapter: 4, level: 18, name: 'Runik',     w: 26, h: 20, shape: 'diamond',    seedStart: 18000 },
    { id: 'viking_4', chapter: 4, level: 19, name: 'Fiyort',    w: 26, h: 20, shape: 'solidoval',  seedStart: 19000 },
    { id: 'viking_5', chapter: 4, level: 20, name: 'Valhalla',  w: 26, h: 20, shape: 'steppyramid', seedStart: 20000 },

    // CH5: OSMANLI - Cok Zor
    { id: 'ottoman_1', chapter: 5, level: 21, name: 'Cami',     w: 26, h: 22, shape: 'mosque',     seedStart: 21000 },
    { id: 'ottoman_2', chapter: 5, level: 22, name: 'Lale',     w: 26, h: 22, shape: 'tulip',      seedStart: 22000 },
    { id: 'ottoman_3', chapter: 5, level: 23, name: 'Kubbe',    w: 26, h: 22, shape: 'solidoval',  seedStart: 23000 },
    { id: 'ottoman_4', chapter: 5, level: 24, name: 'Minare',   w: 26, h: 22, shape: 'castle',     seedStart: 24000 },
    { id: 'ottoman_5', chapter: 5, level: 25, name: 'Sultan',   w: 26, h: 22, shape: 'diamond',    seedStart: 25000 },

    // CH6: CIN - Cok Zor+
    { id: 'china_1', chapter: 6, level: 26, name: 'Pagoda',     w: 28, h: 24, shape: 'pagoda',     seedStart: 26000 },
    { id: 'china_2', chapter: 6, level: 27, name: 'Ejderha',    w: 28, h: 24, shape: 'dragon',     seedStart: 27000 },
    { id: 'china_3', chapter: 6, level: 28, name: 'Ipek Yolu',  w: 28, h: 24, shape: 'steppyramid', seedStart: 28000 },
    { id: 'china_4', chapter: 6, level: 29, name: 'Sur',        w: 28, h: 24, shape: 'castle',     seedStart: 29000 },
    { id: 'china_5', chapter: 6, level: 30, name: 'Imparator',  w: 28, h: 24, shape: 'solidoval',  seedStart: 30000 },

    // CH7: MAYA - Efsanevi
    { id: 'maya_1', chapter: 7, level: 31, name: 'Piramit',     w: 28, h: 26, shape: 'mayapyramid', seedStart: 31000 },
    { id: 'maya_2', chapter: 7, level: 32, name: 'Takvim',      w: 28, h: 26, shape: 'suncalendar', seedStart: 32000 },
    { id: 'maya_3', chapter: 7, level: 33, name: 'Jaguar',      w: 28, h: 26, shape: 'solidoval',  seedStart: 33000 },
    { id: 'maya_4', chapter: 7, level: 34, name: 'Gunes',       w: 28, h: 26, shape: 'diamond',    seedStart: 34000 },
    { id: 'maya_5', chapter: 7, level: 35, name: 'Kukulkan',    w: 28, h: 26, shape: 'steppyramid', seedStart: 35000 },

    // CH8: HINT - Efsanevi+
    { id: 'india_1', chapter: 8, level: 36, name: 'Tac Mahal',  w: 30, h: 28, shape: 'tajmahal',   seedStart: 36000 },
    { id: 'india_2', chapter: 8, level: 37, name: 'Lotus',      w: 30, h: 28, shape: 'lotus',      seedStart: 37000 },
    { id: 'india_3', chapter: 8, level: 38, name: 'Mandala',    w: 30, h: 28, shape: 'solidoval',  seedStart: 38000 },
    { id: 'india_4', chapter: 8, level: 39, name: 'Ganj',       w: 30, h: 28, shape: 'diamond',    seedStart: 39000 },
    { id: 'india_5', chapter: 8, level: 40, name: 'Mogol',      w: 30, h: 28, shape: 'steppyramid', seedStart: 40000 },

    // CH9: ORTACAG - Kabus
    { id: 'medieval_1', chapter: 9, level: 41, name: 'Kale',    w: 32, h: 30, shape: 'castle',     seedStart: 41000 },
    { id: 'medieval_2', chapter: 9, level: 42, name: 'Kalkan',   w: 32, h: 30, shape: 'shield',    seedStart: 42000 },
    { id: 'medieval_3', chapter: 9, level: 43, name: 'Katedral', w: 32, h: 30, shape: 'temple',    seedStart: 43000 },
    { id: 'medieval_4', chapter: 9, level: 44, name: 'Simyaci',  w: 32, h: 30, shape: 'solidoval', seedStart: 44000 },
    { id: 'medieval_5', chapter: 9, level: 45, name: 'Ejderha',  w: 32, h: 30, shape: 'diamond',   seedStart: 45000 },

    // CH10: FINAL - Kabus+
    { id: 'final_1', chapter: 10, level: 46, name: 'Birlesim',  w: 32, h: 32, shape: 'solidoval',  seedStart: 46000 },
    { id: 'final_2', chapter: 10, level: 47, name: 'Portal',    w: 32, h: 32, shape: 'portal',     seedStart: 47000 },
    { id: 'final_3', chapter: 10, level: 48, name: 'Efsane',    w: 32, h: 32, shape: 'mosque',     seedStart: 48000 },
    { id: 'final_4', chapter: 10, level: 49, name: 'Miras',     w: 32, h: 32, shape: 'castle',     seedStart: 49000 },
    { id: 'final_5', chapter: 10, level: 50, name: 'Sonsuzluk', w: 32, h: 32, shape: 'diamond',    seedStart: 50000 },
];
```

Note: `diff` field is removed — difficulty is now derived from `CHAPTER_CONFIG[spec.chapter]`.

- [ ] **Step 2: Verify the config is syntactically correct**

Run: `node -e "import('./generate-levels.mjs')" 2>&1 | head -5`

Expected: No syntax errors (generation may fail since new shapes don't exist yet — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add generate-levels.mjs
git commit -m "feat: add chapter-based difficulty config with trapRatio, chainDepth, density, maxPathLen"
```

---

### Task 2: Rewrite pickDirection() with trapRatio support

**Files:**
- Modify: `generate-levels.mjs:468-490` (pickDirection function)

- [ ] **Step 1: Add edge detection helper**

Add this function before `generateShapedLevel()`:

```javascript
function cellIsOnShapeEdge(x, y, mask, width, height) {
    if (!mask[y][x]) return false;
    // A cell is on the shape edge if any of its 4 neighbors is outside the mask or grid
    if (x === 0 || !mask[y][x - 1]) return true;
    if (x === width - 1 || !mask[y][x + 1]) return true;
    if (y === 0 || !mask[y - 1][x]) return true;
    if (y === height - 1 || !mask[y + 1][x]) return true;
    return false;
}
```

- [ ] **Step 2: Add direction helpers**

Add these functions after `cellIsOnShapeEdge`:

```javascript
function mostBlockedDirection(hx, hy, mask, width, height) {
    const dirs = ['up', 'down', 'left', 'right'];
    let best = dirs[0], bestCount = -1;
    for (const d of dirs) {
        const [dx, dy] = getDirVec(d);
        let cx = hx + dx, cy = hy + dy, count = 0;
        while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            if (mask[cy][cx]) count++;
            cx += dx; cy += dy;
        }
        if (count > bestCount) { bestCount = count; best = d; }
    }
    return best;
}

function leastBlockedDirection(hx, hy, mask, width, height) {
    const dirs = ['up', 'down', 'left', 'right'];
    let best = dirs[0], bestCount = Infinity;
    for (const d of dirs) {
        const [dx, dy] = getDirVec(d);
        let cx = hx + dx, cy = hy + dy, count = 0;
        while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            if (mask[cy][cx]) count++;
            cx += dx; cy += dy;
        }
        if (count < bestCount) { bestCount = count; best = d; }
    }
    return best;
}
```

- [ ] **Step 3: Rewrite pickDirection()**

Replace the existing `pickDirection(cells)` inside `generateShapedLevel()` with:

```javascript
    function pickDirection(cells) {
        const head = cells[cells.length - 1];
        const [hx, hy] = head;
        const config = CHAPTER_CONFIG[chapterNum] || CHAPTER_CONFIG[1];
        const isEdge = cellIsOnShapeEdge(hx, hy, mask, width, height);

        if (isEdge && rand() < config.trapRatio) {
            // Trap: edge arrow points inward (most blocked direction)
            return mostBlockedDirection(hx, hy, mask, width, height);
        } else if (isEdge) {
            // Normal: edge arrow points outward (least blocked direction)
            return leastBlockedDirection(hx, hy, mask, width, height);
        } else {
            // Interior arrows: weighted random (same as before but using config)
            const dirs = ['up', 'down', 'left', 'right'];
            const costs = dirs.map(d => {
                const [dx, dy] = getDirVec(d);
                let cx = hx + dx, cy = hy + dy, maskCells = 0;
                while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                    if (mask[cy][cx]) maskCells++;
                    cx += dx; cy += dy;
                }
                return { dir: d, cost: maskCells };
            });
            costs.sort((a, b) => b.cost - a.cost);
            const r = rand();
            if (r < 0.6) return costs[0].dir;
            if (r < 0.9) return costs[1].dir;
            return costs[2]?.dir || costs[0].dir;
        }
    }
```

Note: `chapterNum` must be passed into `generateShapedLevel()`. Update its signature from `generateShapedLevel(width, height, mask, seed, difficulty)` to `generateShapedLevel(width, height, mask, seed, chapterNum)`. Also update the call site (around line 755) to pass `spec.chapter` instead of `spec.diff`.

- [ ] **Step 4: Update maxPathLen to use config**

Replace the existing lines (around line 493-494):
```javascript
    const minLen = 2;
    const maxLen = difficulty > 0.6 ? 12 : difficulty > 0.3 ? 10 : 8;
```

With:
```javascript
    const config = CHAPTER_CONFIG[chapterNum] || CHAPTER_CONFIG[1];
    const minLen = 2;
    const maxLen = config.maxPathLen;
```

- [ ] **Step 5: Commit**

```bash
git add generate-levels.mjs
git commit -m "feat: rewrite pickDirection with trapRatio-based edge arrow logic"
```

---

### Task 3: Add new cultural shape masks

**Files:**
- Modify: `generate-levels.mjs` (add new shape functions, update `getShapeMask`)

- [ ] **Step 1: Add Sphinx shape**

Add after `makePyramid()`:

```javascript
function makeSphinx(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Head (top 30%)
    const headH = Math.floor(h * 0.3);
    const headW = Math.floor(w * 0.2);
    for (let y = 0; y < headH; y++) {
        for (let x = cx - headW; x <= cx + headW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Body (horizontal rectangle, 70% width, bottom 70%)
    const bodyW = Math.floor(w * 0.45);
    for (let y = headH; y < h - 2; y++) {
        for (let x = cx - bodyW; x <= cx + bodyW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Paws (front extensions)
    const pawW = Math.floor(w * 0.15);
    for (let y = Math.floor(h * 0.6); y < h; y++) {
        for (let x = cx - bodyW - pawW; x < cx - bodyW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
        for (let x = cx + bodyW + 1; x <= cx + bodyW + pawW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}
```

- [ ] **Step 2: Add Amphora shape**

```javascript
function makeAmphora(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Rim (narrow top)
    const rimW = Math.floor(w * 0.15);
    for (let y = 0; y < Math.floor(h * 0.08); y++) {
        for (let x = cx - rimW; x <= cx + rimW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Neck (narrow)
    const neckH = Math.floor(h * 0.2);
    const neckW = Math.floor(w * 0.1);
    for (let y = Math.floor(h * 0.08); y < neckH; y++) {
        for (let x = cx - neckW; x <= cx + neckW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Handles (ears on sides at neck-body junction)
    const handleY = Math.floor(h * 0.15);
    const handleH = Math.floor(h * 0.15);
    for (let y = handleY; y < handleY + handleH; y++) {
        const hw = Math.floor(w * 0.08);
        for (let dx = 0; dx < hw; dx++) {
            if (cx - neckW - hw + dx >= 0) mask[y][cx - neckW - hw + dx] = true;
            if (cx + neckW + dx + 1 < w) mask[y][cx + neckW + dx + 1] = true;
        }
    }
    // Body (wide belly, widest at 60% height)
    for (let y = neckH; y < h - Math.floor(h * 0.08); y++) {
        const progress = (y - neckH) / (h - neckH - Math.floor(h * 0.08));
        const bellyCurve = Math.sin(progress * Math.PI);
        const halfW = Math.floor(neckW + bellyCurve * (w * 0.35 - neckW));
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Base (narrow foot)
    const baseW = Math.floor(w * 0.12);
    for (let y = h - Math.floor(h * 0.08); y < h; y++) {
        for (let x = cx - baseW; x <= cx + baseW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}
```

- [ ] **Step 3: Add Eagle shape**

```javascript
function makeEagle(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Head (small circle at top center)
    const headR = Math.floor(Math.min(w, h) * 0.08);
    const headY = Math.floor(h * 0.1);
    for (let y = 0; y < headY + headR; y++) {
        for (let x = cx - headR; x <= cx + headR; x++) {
            if (x >= 0 && x < w) {
                const dist = Math.sqrt((x - cx) ** 2 + (y - headY) ** 2);
                if (dist <= headR) mask[y][x] = true;
            }
        }
    }
    // Body (vertical oval center)
    const bodyTop = headY + headR - 1;
    const bodyBot = Math.floor(h * 0.75);
    const bodyW = Math.floor(w * 0.12);
    for (let y = bodyTop; y <= bodyBot; y++) {
        for (let x = cx - bodyW; x <= cx + bodyW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Wings (spread wide, attached at body middle)
    const wingY = Math.floor(h * 0.25);
    const wingH = Math.floor(h * 0.35);
    for (let y = wingY; y < wingY + wingH; y++) {
        const progress = (y - wingY) / wingH;
        const wingSpan = Math.floor((1 - Math.abs(progress - 0.3) * 1.5) * (w * 0.48));
        for (let x = cx - wingSpan; x <= cx + wingSpan; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Tail (V-shape at bottom)
    for (let y = bodyBot; y < h; y++) {
        const progress = (y - bodyBot) / (h - bodyBot);
        const tailW = Math.floor(progress * w * 0.2) + bodyW;
        for (let x = cx - tailW; x <= cx + tailW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}
```

- [ ] **Step 4: Add Hammer (Mjolnir) shape**

```javascript
function makeHammer(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Head (wide rectangle at top, 60% width, 25% height)
    const headH = Math.floor(h * 0.25);
    const headW = Math.floor(w * 0.35);
    for (let y = 0; y < headH; y++) {
        for (let x = cx - headW; x <= cx + headW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Handle (narrow vertical, center, 75% height)
    const handleW = Math.floor(w * 0.08);
    for (let y = headH; y < h - Math.floor(h * 0.08); y++) {
        for (let x = cx - handleW; x <= cx + handleW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Grip (slightly wider base)
    const gripW = Math.floor(w * 0.12);
    for (let y = h - Math.floor(h * 0.08); y < h; y++) {
        for (let x = cx - gripW; x <= cx + gripW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}
```

- [ ] **Step 5: Add Tulip shape**

```javascript
function makeTulip(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Petals (3 overlapping ovals at top, 45% of height)
    const petalH = Math.floor(h * 0.45);
    const petalW = Math.floor(w * 0.2);
    for (let y = 0; y < petalH; y++) {
        const progress = y / petalH;
        // Center petal
        const cw = Math.floor(Math.sin(progress * Math.PI) * petalW);
        for (let x = cx - cw; x <= cx + cw; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
        // Left petal (offset left)
        const lx = cx - Math.floor(w * 0.12);
        const lw = Math.floor(Math.sin(progress * Math.PI) * petalW * 0.8);
        for (let x = lx - lw; x <= lx + lw; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
        // Right petal (offset right)
        const rx = cx + Math.floor(w * 0.12);
        for (let x = rx - lw; x <= rx + lw; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Stem (narrow vertical center, 55% height)
    const stemW = Math.floor(w * 0.06);
    for (let y = petalH; y < h - Math.floor(h * 0.1); y++) {
        for (let x = cx - stemW; x <= cx + stemW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Leaves (small bumps on sides of stem)
    const leafY = Math.floor(h * 0.6);
    const leafH = Math.floor(h * 0.12);
    const leafW = Math.floor(w * 0.12);
    for (let y = leafY; y < leafY + leafH; y++) {
        const p = (y - leafY) / leafH;
        const lw = Math.floor(Math.sin(p * Math.PI) * leafW);
        for (let x = cx - stemW - lw; x < cx - stemW; x++) {
            if (x >= 0) mask[y][x] = true;
        }
        for (let x = cx + stemW + 1; x <= cx + stemW + lw; x++) {
            if (x < w) mask[y][x] = true;
        }
    }
    // Base
    const baseW = Math.floor(w * 0.1);
    for (let y = h - Math.floor(h * 0.1); y < h; y++) {
        for (let x = cx - baseW; x <= cx + baseW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}
```

- [ ] **Step 6: Add Dragon, Sun Calendar, Lotus, Shield, and Portal shapes**

```javascript
function makeDragon(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // S-curve body from top-right to bottom-left
    for (let y = 0; y < h; y++) {
        const progress = y / h;
        // S-curve: center shifts left-right
        const offsetX = Math.floor(Math.sin(progress * Math.PI * 2) * w * 0.25);
        const bodyW = Math.floor(w * 0.12 + Math.sin(progress * Math.PI) * w * 0.08);
        const bx = cx + offsetX;
        for (let x = bx - bodyW; x <= bx + bodyW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Head (wider top area)
    const headR = Math.floor(w * 0.15);
    const headCx = cx + Math.floor(w * 0.2);
    for (let y = 0; y < Math.floor(h * 0.15); y++) {
        for (let x = headCx - headR; x <= headCx + headR; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Tail (wider bottom, slight fan)
    for (let y = Math.floor(h * 0.85); y < h; y++) {
        const p = (y - Math.floor(h * 0.85)) / (h * 0.15);
        const tailW = Math.floor(w * 0.15 + p * w * 0.1);
        const tx = cx - Math.floor(w * 0.2);
        for (let x = tx - tailW; x <= tx + tailW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makeSunCalendar(w, h) {
    // Concentric rings (thick oval with inner cutout + center dot)
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const d = dx * dx + dy * dy;
            // Outer ring
            if (d <= 1.0 && d >= 0.55) mask[y][x] = true;
            // Inner circle
            if (d <= 0.2) mask[y][x] = true;
        }
    }
    // Cross lines (N-S-E-W spokes)
    const spokeW = 1;
    for (let y = 0; y < h; y++) {
        const dx = (Math.floor(cx) - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) {
            for (let sx = -spokeW; sx <= spokeW; sx++) {
                const xx = Math.floor(cx) + sx;
                if (xx >= 0 && xx < w) mask[y][xx] = true;
            }
        }
    }
    for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rx;
        const dy = (Math.floor(cy) - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) {
            for (let sy = -spokeW; sy <= spokeW; sy++) {
                const yy = Math.floor(cy) + sy;
                if (yy >= 0 && yy < h) mask[yy][x] = true;
            }
        }
    }
    return mask;
}

function makeLotus(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h * 0.45);
    // 5 petals radiating upward
    const petalCount = 5;
    for (let p = 0; p < petalCount; p++) {
        const angle = -Math.PI / 2 + (p - 2) * (Math.PI / 6);
        const petalLen = Math.floor(Math.min(w, h) * 0.35);
        const petalW = Math.floor(Math.min(w, h) * 0.12);
        for (let d = 0; d < petalLen; d++) {
            const px = cx + Math.floor(Math.cos(angle) * d);
            const py = cy + Math.floor(Math.sin(angle) * d);
            const wid = Math.floor(petalW * Math.sin((d / petalLen) * Math.PI));
            for (let s = -wid; s <= wid; s++) {
                const fx = px + Math.floor(Math.cos(angle + Math.PI / 2) * s);
                const fy = py + Math.floor(Math.sin(angle + Math.PI / 2) * s);
                if (fx >= 0 && fx < w && fy >= 0 && fy < h) mask[fy][fx] = true;
            }
        }
    }
    // Base (wide shallow arc at bottom)
    for (let y = Math.floor(h * 0.7); y < h; y++) {
        const progress = (y - Math.floor(h * 0.7)) / (h * 0.3);
        const halfW = Math.floor((1 - progress * 0.3) * w * 0.4);
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makeShield(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Top: flat or slightly rounded (full width)
    for (let y = 0; y < Math.floor(h * 0.15); y++) {
        for (let x = 1; x < w - 1; x++) mask[y][x] = true;
    }
    // Middle: full width tapering to point
    for (let y = Math.floor(h * 0.15); y < h; y++) {
        const progress = (y - Math.floor(h * 0.15)) / (h - Math.floor(h * 0.15));
        const halfW = Math.floor((1 - progress * progress) * (w / 2 - 1));
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makePortal(w, h) {
    // Thick ring with energy lines
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    const thickness = 4;
    const rxI = rx - thickness;
    const ryI = ry - thickness;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const outer = dx * dx + dy * dy;
            const dxI = rxI > 0 ? (x - cx) / rxI : 999;
            const dyI = ryI > 0 ? (y - cy) / ryI : 999;
            const inner = dxI * dxI + dyI * dyI;
            if (outer <= 1.0 && inner >= 1.0) mask[y][x] = true;
        }
    }
    // Cross pattern inside (diagonal X)
    for (let i = -Math.floor(rxI * 0.7); i <= Math.floor(rxI * 0.7); i++) {
        const px1 = Math.floor(cx + i);
        const py1 = Math.floor(cy + i);
        const py2 = Math.floor(cy - i);
        if (px1 >= 0 && px1 < w && py1 >= 0 && py1 < h) mask[py1][px1] = true;
        if (px1 >= 0 && px1 < w && py2 >= 0 && py2 < h) mask[py2][px1] = true;
    }
    return mask;
}
```

- [ ] **Step 7: Update getShapeMask() to include all new shapes**

Replace the existing `getShapeMask()` function:

```javascript
function getShapeMask(spec) {
    switch (spec.shape) {
        case 'pyramid': return makePyramid(spec.w, spec.h, 0, spec.h - 1);
        case 'diamond': return makeDiamond(spec.w, spec.h);
        case 'steppyramid': return makeStepPyramid(spec.w, spec.h);
        case 'temple': return makeTemple(spec.w, spec.h);
        case 'arch': return makeArch(spec.w, spec.h);
        case 'aqueduct': return makeAqueduct(spec.w, spec.h);
        case 'oval3': return makeOval(spec.w, spec.h, 3);
        case 'oval4': return makeOval(spec.w, spec.h, 4);
        case 'oval5': return makeOval(spec.w, spec.h, 5);
        case 'oval6': return makeOval(spec.w, spec.h, 6);
        case 'ship': return makeShip(spec.w, spec.h);
        case 'mosque': return makeMosque(spec.w, spec.h);
        case 'pagoda': return makePagoda(spec.w, spec.h);
        case 'mayapyramid': return makeMayaPyramid(spec.w, spec.h);
        case 'tajmahal': return makeTajMahal(spec.w, spec.h);
        case 'castle': return makeCastle(spec.w, spec.h);
        case 'solidoval': return makeSolidOval(spec.w, spec.h);
        // New cultural shapes
        case 'sphinx': return makeSphinx(spec.w, spec.h);
        case 'amphora': return makeAmphora(spec.w, spec.h);
        case 'eagle': return makeEagle(spec.w, spec.h);
        case 'hammer': return makeHammer(spec.w, spec.h);
        case 'tulip': return makeTulip(spec.w, spec.h);
        case 'dragon': return makeDragon(spec.w, spec.h);
        case 'suncalendar': return makeSunCalendar(spec.w, spec.h);
        case 'lotus': return makeLotus(spec.w, spec.h);
        case 'shield': return makeShield(spec.w, spec.h);
        case 'portal': return makePortal(spec.w, spec.h);
        default: return makeSolidOval(spec.w, spec.h);
    }
}
```

- [ ] **Step 8: Commit**

```bash
git add generate-levels.mjs
git commit -m "feat: add 10 new cultural shape masks (sphinx, amphora, eagle, hammer, tulip, dragon, suncalendar, lotus, shield, portal)"
```

---

### Task 4: Update generation loop and generate all levels

**Files:**
- Modify: `generate-levels.mjs` (generation loop around line 739-788)

- [ ] **Step 1: Update the generation loop to use chapterNum**

Replace the main generation loop. The key change is passing `spec.chapter` instead of `spec.diff` to `generateShapedLevel()`:

```javascript
for (const spec of levelSpecs) {
    const mask = getShapeMask(spec);
    const totalCells = countCells(mask);
    const config = CHAPTER_CONFIG[spec.chapter];
    console.log(`\n=== ${spec.name} (${spec.w}x${spec.h}, ${totalCells} cells, ch=${spec.chapter}, trap=${config.trapRatio}) ===`);

    // Print shape
    for (let y = 0; y < spec.h; y++) {
        let row = '  ';
        for (let x = 0; x < spec.w; x++) row += mask[y][x] ? 'X' : '.';
        console.log(row);
    }

    let bestPaths = null;
    let bestSeed = 0;

    for (let seed = spec.seedStart; seed < spec.seedStart + 5000; seed++) {
        const paths = generateShapedLevel(spec.w, spec.h, mask, seed, spec.chapter);
        const v = validateLevel(paths, spec.w, spec.h, mask);

        if (v.overlaps > 0 || v.adjErrors > 0 || v.oobErrors > 0) continue;
        if (v.covered < totalCells * 0.95) continue;

        const solved = fixSolvability(paths, spec.w, spec.h, 300);
        if (solved) {
            bestPaths = paths;
            bestSeed = seed;
            break;
        }
    }

    if (!bestPaths) {
        console.log(`  FAILED to find solvable level!`);
        continue;
    }

    const v = validateLevel(bestPaths, spec.w, spec.h, mask);
    const result = simulateSolve(bestPaths, spec.w, spec.h);
    const initialFree = bestPaths.filter((_, i) => isPathClear(bestPaths, i, new Set(), spec.w, spec.h)).length;

    const sizes = {};
    bestPaths.forEach(p => { sizes[p.cells.length] = (sizes[p.cells.length] || 0) + 1; });
    const sizeStr = Object.entries(sizes).sort((a,b) => b[0]-a[0]).map(([s,c]) => `${s}:${c}`).join(' ');

    console.log(`  Seed: ${bestSeed}, Paths: ${bestPaths.length}, Coverage: ${v.covered}/${totalCells}`);
    console.log(`  Initially removable: ${initialFree}/${bestPaths.length} (${(initialFree/bestPaths.length*100).toFixed(0)}%)`);
    console.log(`  Sizes: ${sizeStr}`);

    allLevels.push({ ...spec, paths: bestPaths });
}
```

- [ ] **Step 2: Run the level generator**

Run: `node generate-levels.mjs`

Expected: All 50 levels generate successfully. Output shows shape masks and statistics. Look for "FAILED" messages — there should be none. If any fail, it's likely a new shape mask that's too sparse — increase seed range or adjust shape.

- [ ] **Step 3: Verify generated levels visually**

Open `test-shapes.html` in a browser and check that:
- Cultural shapes are recognizable (pyramid, sphinx, amphora, eagle, etc.)
- Grid density looks appropriate for each chapter
- Edge arrows have a mix of inward/outward directions

- [ ] **Step 4: Commit all generated levels**

```bash
git add generate-levels.mjs js/data/levels/*.js
git commit -m "feat: regenerate all 50 levels with new difficulty params and cultural shapes"
```

---

### Task 5: Update chapter difficulty labels

**Files:**
- Modify: `js/data/chapters.js`

- [ ] **Step 1: Update difficulty labels**

Change the `difficulty` field in each chapter object:

```
Chapter 1 (Misir): 'Cok Kolay' -> 'Kolay'
Chapter 2 (Yunan): 'Kolay' -> 'Orta'
Chapter 3 (Roma): 'Kolay-Orta' -> 'Zor'
Chapter 4 (Viking): 'Zor' -> 'Zor+'
Chapter 5 (Osmanli): 'Orta' -> 'Cok Zor'
Chapter 6 (Cin): 'Orta-Zor' -> 'Cok Zor+'
Chapter 7 (Maya): 'Zor' -> 'Efsanevi'
Chapter 8 (Hint): 'Zor' -> 'Efsanevi+'
Chapter 9 (Ortacag Avrupa): 'Cok Zor' -> 'Kabus'
Chapter 10 (Final): 'Uzman' -> 'Kabus+'
```

- [ ] **Step 2: Commit**

```bash
git add js/data/chapters.js
git commit -m "feat: update chapter difficulty labels to match new progression"
```

---

## Phase 2: Engine Renewal

### Task 6: Create easing utilities module

**Files:**
- Create: `js/easing.js`

- [ ] **Step 1: Create the easing module**

```javascript
// js/easing.js
// Easing functions for premium animations

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t) {
    return t * t * t;
}

export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
}

export function easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

// Linear interpolation
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/easing.js
git commit -m "feat: add easing utilities module for premium animations"
```

---

### Task 7: Rewrite arrow removal animation (3-phase)

**Files:**
- Modify: `js/game.js:153-207` (removePathWithAnimation method)

- [ ] **Step 1: Import easing functions**

Add at the top of `js/game.js`:

```javascript
import { easeOutCubic, easeOutBack } from './easing.js';
```

- [ ] **Step 2: Replace removePathWithAnimation()**

Replace the entire `removePathWithAnimation(path)` method:

```javascript
    removePathWithAnimation(path) {
        this.isAnimating = true;
        this.grid.removePath(path);

        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));
        const distance = Math.max(this.grid.width, this.grid.height) + 4;

        // 3-phase animation: anticipation -> launch -> trail+fade
        const phase1 = 80;   // anticipation
        const phase2 = 200;  // launch
        const phase3 = 150;  // trail + fade
        const totalDuration = phase1 + phase2 + phase3;
        const startTime = performance.now();

        // Ghost trail state
        const trailAlpha = { value: 0 };

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);

            let shift;
            if (elapsed < phase1) {
                // Phase 1: Anticipation — pull back slightly opposite to direction
                const p = elapsed / phase1;
                shift = -0.2 * Math.sin(p * Math.PI / 2);
                trailAlpha.value = 0;
            } else if (elapsed < phase1 + phase2) {
                // Phase 2: Launch — fast acceleration in direction
                const p = (elapsed - phase1) / phase2;
                const eased = easeOutCubic(p);
                shift = -0.2 * (1 - p) + distance * eased;
                trailAlpha.value = 1 - p * 0.3;
            } else {
                // Phase 3: Trail fades out (arrow already off screen)
                const p = (elapsed - phase1 - phase2) / phase3;
                shift = distance;
                trailAlpha.value = Math.max(0, 0.7 * (1 - p));
            }

            // Update cell positions
            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * shift;
                path.cells[i].y = origCells[i].y + dy * shift;
            }

            this.renderer.drawGrid(this.grid);

            // Draw ghost trail during phase 2-3
            if (trailAlpha.value > 0 && elapsed >= phase1) {
                this.renderer.drawGhostTrail(origCells, path.direction, trailAlpha.value);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restore positions and finalize
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
```

- [ ] **Step 3: Add drawGhostTrail to renderer**

Add this method to `js/renderer.js` (before `drawHintHighlight`):

```javascript
    drawGhostTrail(cells, direction, alpha) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = this.theme.arrowIdle;
        ctx.lineWidth = this._getArrowMetrics().width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([4, 6]);

        ctx.beginPath();
        for (let i = 0; i < cells.length; i++) {
            const cx = this.gridOffsetX + cells[i].x * this.cellSize + this.cellSize / 2;
            const cy = this.gridOffsetY + cells[i].y * this.cellSize + this.cellSize / 2;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
```

- [ ] **Step 4: Test the animation in browser**

Open `index.html`, start a level, tap a removable arrow. Verify:
- Brief pull-back is visible (anticipation)
- Arrow launches quickly with acceleration
- Dashed ghost trail fades where arrow was

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/renderer.js
git commit -m "feat: 3-phase arrow removal animation with anticipation, launch, and ghost trail"
```

---

### Task 8: Rewrite wrong move feedback

**Files:**
- Modify: `js/game.js:209-279` (handleWrongMove method)
- Modify: `js/renderer.js` (add screen shake support)

- [ ] **Step 1: Add screen shake state to Renderer**

Add these properties in the `Renderer` constructor (after `this.panY = 0;`):

```javascript
        this.shakeX = 0;
        this.shakeY = 0;
```

Update `drawGrid()` to apply shake. Change the transform line:

```javascript
        ctx.translate(this.panX + this.shakeX, this.panY + this.shakeY);
```

- [ ] **Step 2: Replace handleWrongMove()**

Replace the entire `handleWrongMove(path)` method in `js/game.js`:

```javascript
    handleWrongMove(path) {
        if (!this.livesManager.hasLives()) {
            if (this.onNoLives) this.onNoLives();
            return;
        }

        const remaining = this.livesManager.loseLife();
        if (this.onLivesChanged) this.onLivesChanged(remaining);

        this.isAnimating = true;
        const origState = path.state;
        const { dx, dy } = getDirectionVector(path.direction);
        const origCells = path.cells.map(c => ({ x: c.x, y: c.y }));
        const origColor = path._flashColor;

        // Phase timings (ms)
        const p1End = 60;    // forward lunge
        const p2End = 160;   // red flash
        const p3End = 310;   // shake (3 oscillations)
        const p4End = 510;   // elastic return
        const totalDuration = p4End;
        const startTime = performance.now();

        // Screen shake timing
        const shakeStart = p1End;
        const shakeDuration = 100;

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);

            // Phase 1: Forward lunge
            let shift = 0;
            if (elapsed < p1End) {
                const p = elapsed / p1End;
                shift = 0.4 * p;
                path.state = 'removing';
            }
            // Phase 2: Red flash (hold at forward position)
            else if (elapsed < p2End) {
                shift = 0.4;
                path.state = 'removing';
                path._flashColor = '#ff2020';
            }
            // Phase 3: Shake in place
            else if (elapsed < p3End) {
                const p = (elapsed - p2End) / (p3End - p2End);
                shift = 0.4 + Math.sin(p * Math.PI * 6) * 0.12;
                path._flashColor = null;
                path.state = 'removing';
            }
            // Phase 4: Elastic bounce back
            else {
                const p = (elapsed - p3End) / (p4End - p3End);
                const elastic = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 1.5);
                shift = 0.4 * (1 - Math.min(elastic, 1));
                path.state = origState;
            }

            // Screen shake effect
            if (elapsed >= shakeStart && elapsed < shakeStart + shakeDuration) {
                const sp = (elapsed - shakeStart) / shakeDuration;
                const intensity = 2 * (1 - sp);
                this.renderer.shakeX = Math.sin(sp * Math.PI * 8) * intensity;
                this.renderer.shakeY = Math.cos(sp * Math.PI * 6) * intensity;
            } else {
                this.renderer.shakeX = 0;
                this.renderer.shakeY = 0;
            }

            // Apply shift
            for (let i = 0; i < path.cells.length; i++) {
                path.cells[i].x = origCells[i].x + dx * shift;
                path.cells[i].y = origCells[i].y + dy * shift;
            }

            this.renderer.drawGrid(this.grid);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restore everything
                for (let i = 0; i < path.cells.length; i++) {
                    path.cells[i].x = origCells[i].x;
                    path.cells[i].y = origCells[i].y;
                }
                path.state = origState;
                path._flashColor = null;
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
```

- [ ] **Step 3: Support _flashColor in renderer**

In `js/renderer.js`, update the `drawPath()` method. Change the color line:

```javascript
        const color = isRemoving
            ? (path._flashColor || this.theme.arrowRemoving)
            : this.theme.arrowIdle;
```

- [ ] **Step 4: Test wrong move in browser**

Open a level, tap a non-removable arrow. Verify:
- Forward lunge is visible
- Arrow briefly flashes bright red
- Arrow shakes 3 times
- Bounces back with elastic feel
- Screen shakes briefly

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/renderer.js
git commit -m "feat: premium wrong move feedback with red flash, shake, and screen shake"
```

---

### Task 9: Add touch feedback and removable pulse

**Files:**
- Modify: `js/renderer.js` (add pulse glow for removable arrows)
- Modify: `js/game.js` (add touch press feedback, continuous render loop)

- [ ] **Step 1: Add animation time tracking to Renderer**

Add to the `Renderer` constructor:

```javascript
        this.animTime = 0;
```

Add a method to update animation time:

```javascript
    tick(time) {
        this.animTime = time;
    }
```

- [ ] **Step 2: Add subtle pulse to removable arrows**

In `js/renderer.js`, update `drawPath()` to add pulse glow for removable arrows. After the existing removable glow block (`if (isRemovable) { ... }`), add the idle pulse for all idle/removable arrows:

Actually, the spec says removable arrows should get a subtle pulse. But currently idle and removable look the same (by design — player must figure it out). The spec says "kaldirilabilir oklar subtle bir nabiz efekti ile atar (pulse glow, cok hafif)" — this is a design change: removable arrows now get a very subtle hint.

Update `drawGrid()` to pass removable state to `drawPath()`:

```javascript
        for (const path of grid.paths) {
            if (path.state === ArrowState.IDLE || path.state === ArrowState.REMOVABLE) {
                this.drawPath(path, path.state === ArrowState.REMOVABLE);
            }
        }
```

Then in `drawPath()`, add the pulse after the existing glow block:

```javascript
        // Subtle pulse for removable arrows
        if (isRemovable && this.animTime > 0) {
            const pulse = 0.5 + 0.5 * Math.sin(this.animTime / 800);
            const glowAlpha = 0.04 + pulse * 0.06;
            ctx.strokeStyle = `rgba(100,70,30,${glowAlpha})`;
            ctx.lineWidth = metrics.width + 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            this._strokePoints(ctx, points);
        }
```

- [ ] **Step 3: Add continuous render loop for pulse animation**

In `js/game.js`, add a render loop that runs when a level is active. Add to `startLevel()`:

```javascript
        this.startRenderLoop();
```

Add the method:

```javascript
    startRenderLoop() {
        if (this._renderLoopId) cancelAnimationFrame(this._renderLoopId);
        const loop = (time) => {
            if (!this.grid) return;
            this.renderer.tick(time);
            if (!this.isAnimating) {
                this.renderer.drawGrid(this.grid);
            }
            this._renderLoopId = requestAnimationFrame(loop);
        };
        this._renderLoopId = requestAnimationFrame(loop);
    }

    stopRenderLoop() {
        if (this._renderLoopId) {
            cancelAnimationFrame(this._renderLoopId);
            this._renderLoopId = null;
        }
    }
```

- [ ] **Step 4: Add touch press scale feedback**

In `js/game.js`, in the `handleTap` function inside `setupInput()`, add a brief scale effect. Before `this.removePathWithAnimation(path)` and `this.handleWrongMove(path)`, add:

```javascript
            // Brief touch feedback — scale the tapped path's cells slightly
            this.renderer.touchFeedback = { path, startTime: performance.now() };
```

In `js/renderer.js`, add a `touchFeedback` property to constructor: `this.touchFeedback = null;`

In `drawPath()`, add at the beginning:

```javascript
        // Touch press scale effect
        let scaleEffect = 1;
        if (this.touchFeedback && this.touchFeedback.path === path) {
            const elapsed = this.animTime - this.touchFeedback.startTime;
            if (elapsed < 100) {
                scaleEffect = 1 + 0.05 * Math.sin((elapsed / 100) * Math.PI);
            } else {
                this.touchFeedback = null;
            }
        }
```

Apply the scale around the path drawing (before the main line draw, after getting points):

```javascript
        if (scaleEffect !== 1) {
            const center = this._cellCenter(path.cells[Math.floor(path.cells.length / 2)]);
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.scale(scaleEffect, scaleEffect);
            ctx.translate(-center.x, -center.y);
        }
```

And close it after the tail drawing:

```javascript
        if (scaleEffect !== 1) {
            ctx.restore();
        }
```

- [ ] **Step 5: Test in browser**

- Removable arrows should have a very subtle breathing glow
- Tapping an arrow should briefly make it slightly larger before animation

- [ ] **Step 6: Commit**

```bash
git add js/game.js js/renderer.js
git commit -m "feat: add removable arrow pulse glow and touch press scale feedback"
```

---

### Task 10: Upgrade celebration particles

**Files:**
- Modify: `js/game.js:293-360` (playCelebration method)

- [ ] **Step 1: Add chapter-based particle colors to chapters data**

In `js/data/chapters.js`, add a `particleColors` array to each chapter's theme object:

```
Chapter 1 (Misir): particleColors: ['#d4a843', '#2b8a9a']  // gold, turquoise
Chapter 2 (Yunan): particleColors: ['#ffffff', '#4a80b0']  // white, blue
Chapter 3 (Roma): particleColors: ['#c04030', '#d4a843']   // red, gold
Chapter 4 (Viking): particleColors: ['#c0c0c0', '#5888a8'] // silver, ice blue
Chapter 5 (Osmanli): particleColors: ['#8a2040', '#d4a843', '#0d6c67'] // burgundy, gold, teal
Chapter 6 (Cin): particleColors: ['#c04030', '#d4a843']    // red, gold
Chapter 7 (Maya): particleColors: ['#408040', '#d4a843']   // green, gold
Chapter 8 (Hint): particleColors: ['#d48020', '#8040a0', '#d4a843'] // saffron, purple, gold
Chapter 9 (Ortacag): particleColors: ['#c0c0c0', '#c07030'] // silver, orange
Chapter 10 (Final): particleColors: ['#d4a843', '#c04030', '#4a80b0', '#408040', '#8040a0'] // all
```

- [ ] **Step 2: Replace playCelebration()**

Replace the entire method:

```javascript
    playCelebration(callback) {
        const rect = this.canvas.getBoundingClientRect();
        const colors = this.currentChapter?.theme?.particleColors
            || ['#d4a843', '#c87030', '#2b6e8a'];
        const particles = [];
        const shapes = ['circle', 'square', 'triangle', 'diamond'];

        // Shockwave ring
        const shockwave = { radius: 0, maxRadius: Math.max(rect.width, rect.height) * 0.6, alpha: 1 };

        // Create 80 particles with varied sizes and shapes
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80 + (Math.random() - 0.5) * 0.5;
            const speed = 3 + Math.random() * 7;
            particles.push({
                x: rect.width / 2 + (Math.random() - 0.5) * 40,
                y: rect.height / 2 + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 4,
                size: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                delay: Math.random() * 100 // staggered start
            });
        }

        const startTime = performance.now();
        const duration = 1500;
        const ctx = this.renderer.ctx;

        // Gentle zoom-out effect
        const origScale = this.renderer.scale;

        const animate = (time) => {
            const elapsed = time - startTime;
            if (elapsed > duration) {
                this.renderer.scale = origScale;
                if (callback) callback();
                return;
            }

            const progress = elapsed / duration;

            // Subtle zoom-out
            this.renderer.scale = origScale * (1 - progress * 0.03);
            this.renderer.drawGrid(this.grid);
            this.renderer.scale = origScale;

            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Draw shockwave ring
            if (shockwave.alpha > 0) {
                shockwave.radius += (shockwave.maxRadius - shockwave.radius) * 0.08;
                shockwave.alpha = Math.max(0, 1 - shockwave.radius / shockwave.maxRadius);
                ctx.strokeStyle = `rgba(255,255,255,${shockwave.alpha * 0.4})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(rect.width / 2, rect.height / 2, shockwave.radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw particles
            for (const p of particles) {
                if (elapsed < p.delay) continue;
                const pElapsed = elapsed - p.delay;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.12; // gravity
                p.vx *= 0.995; // air resistance
                p.rotation += p.rotSpeed;
                p.alpha = Math.max(0, 1 - pElapsed / (duration - p.delay));

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;

                ctx.beginPath();
                switch (p.shape) {
                    case 'circle':
                        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                        break;
                    case 'square':
                        ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
                        break;
                    case 'triangle':
                        ctx.moveTo(0, -p.size);
                        ctx.lineTo(p.size * 0.87, p.size * 0.5);
                        ctx.lineTo(-p.size * 0.87, p.size * 0.5);
                        ctx.closePath();
                        break;
                    case 'diamond':
                        ctx.moveTo(0, -p.size);
                        ctx.lineTo(p.size * 0.6, 0);
                        ctx.lineTo(0, p.size);
                        ctx.lineTo(-p.size * 0.6, 0);
                        ctx.closePath();
                        break;
                }
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }
```

- [ ] **Step 3: Test celebration in browser**

Complete a level. Verify:
- Shockwave ring expands from center
- Particles are varied shapes (circles, squares, triangles, diamonds)
- Colors match the chapter theme
- Subtle zoom-out effect visible
- Lasts about 1.5 seconds

- [ ] **Step 4: Commit**

```bash
git add js/game.js js/data/chapters.js
git commit -m "feat: premium celebration with shockwave, varied particles, chapter colors, and zoom-out"
```

---

### Task 11: Add screen transition animations

**Files:**
- Modify: `js/screens.js` (add fade/slide transitions)
- Modify: `css/style.css` (add transition CSS)

- [ ] **Step 1: Add transition CSS**

Add to the end of `css/style.css`:

```css
/* Screen transitions */
.screen {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.screen:not(.active) {
    opacity: 0;
    transform: translateY(10px);
    pointer-events: none;
}

.screen.active {
    opacity: 1;
    transform: translateY(0);
}
```

- [ ] **Step 2: Test transitions**

Navigate between screens. Verify smooth fade+slide transitions.

- [ ] **Step 3: Commit**

```bash
git add css/style.css js/screens.js
git commit -m "feat: add smooth fade/slide screen transitions"
```

---

## Phase 3: Cultural Polish

### Task 12: Integrate Leonardo AI chapter images

**Files:**
- Modify: `js/screens.js` (chapter thumbnails, story screen)
- Modify: `css/style.css` (story image styling)

- [ ] **Step 1: Add image support to chapter cards**

In `js/screens.js`, in `showChapters()`, add a thumbnail image to each chapter card. After creating `numDiv`:

```javascript
            // Chapter thumbnail
            const thumb = document.createElement('div');
            thumb.className = 'chapter-thumb';
            thumb.style.backgroundImage = `url(${chapter.story.image})`;
```

Replace `card.appendChild(numDiv);` with:

```javascript
            card.appendChild(thumb);
            card.appendChild(numDiv);
```

- [ ] **Step 2: Add CSS for chapter thumbnails**

Add to `css/style.css`:

```css
.chapter-thumb {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
    border: 1px solid var(--theme-border);
}

.chapter-card.locked .chapter-thumb {
    filter: grayscale(1) brightness(0.5);
}

.chapter-card.completed .chapter-number {
    border: 2px solid #d4a843;
    box-shadow: 0 0 8px rgba(212, 168, 67, 0.3);
}
```

- [ ] **Step 3: Commit**

```bash
git add js/screens.js css/style.css
git commit -m "feat: add chapter thumbnail images and gold completed border"
```

Note: Actual image files must be created by the user with Leonardo AI and placed in `assets/chapters/`. The code gracefully handles missing images via the existing `img.onerror` handler.

---

### Task 13: Add sound system

**Files:**
- Create: `js/sound.js`
- Modify: `js/main.js` (wire up sound)
- Modify: `js/game.js` (trigger sounds)

- [ ] **Step 1: Create sound manager**

```javascript
// js/sound.js
// Lightweight sound manager using Web Audio API

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.ctx = null; // Lazy init AudioContext (requires user gesture)
        this.sounds = {};
    }

    _ensureContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Synthesize sounds using Web Audio API (no external files needed)
    play(name) {
        if (!this.enabled) return;
        this._ensureContext();
        const ctx = this.ctx;

        switch (name) {
            case 'tap': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 800;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.08);
                break;
            }
            case 'remove': {
                // Whoosh + ting
                const noise = ctx.createBufferSource();
                const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
                }
                noise.buffer = buffer;
                const noiseGain = ctx.createGain();
                noiseGain.gain.value = 0.06;
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);
                noise.start(ctx.currentTime);

                // Ting
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 1200;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime + 0.05);
                osc.stop(ctx.currentTime + 0.3);
                break;
            }
            case 'wrong': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 200;
                osc.type = 'square';
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.2);
                break;
            }
            case 'complete': {
                // Rising fanfare (3 notes)
                [523, 659, 784].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    const t = ctx.currentTime + i * 0.15;
                    gain.gain.setValueAtTime(0.1, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                    osc.start(t);
                    osc.stop(t + 0.4);
                });
                break;
            }
            case 'swoosh': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.15);
                break;
            }
        }
    }
}

export const sound = new SoundManager();
```

- [ ] **Step 2: Wire up sound toggle button in main.js**

Add to `js/main.js`:

```javascript
import { sound } from './sound.js';

// Sound toggle
const soundBtn = document.getElementById('btn-sound');
soundBtn.addEventListener('click', () => {
    const enabled = sound.toggle();
    soundBtn.querySelector('svg').style.opacity = enabled ? '1' : '0.4';
});
```

- [ ] **Step 3: Add sound triggers to game.js**

Import sound at top of `js/game.js`:

```javascript
import { sound } from './sound.js';
```

Add `sound.play('tap')` at the start of `handleTap` (after `if (!path) return;`).

Add `sound.play('remove')` at the start of `removePathWithAnimation()`.

Add `sound.play('wrong')` at the start of `handleWrongMove()` (after the lives check).

Add `sound.play('complete')` at the start of `playCelebration()`.

- [ ] **Step 4: Test sounds in browser**

- Tap an arrow: short click sound
- Remove an arrow: whoosh + ting
- Wrong move: low buzz
- Complete level: rising 3-note fanfare
- Toggle sound button: sounds on/off

- [ ] **Step 5: Commit**

```bash
git add js/sound.js js/main.js js/game.js
git commit -m "feat: add synthesized sound effects system with tap, remove, wrong, and complete sounds"
```

---

### Task 14: Expand cultural theme colors

**Files:**
- Modify: `js/data/chapters.js` (update theme colors per design spec)

- [ ] **Step 1: Update theme colors**

Update each chapter's theme object to match the design spec's color palette. The key changes are adding or adjusting `backgroundGradient`, `arrowIdle`, `hintColor` for each chapter to better match the cultural aesthetic. Only change colors that differ from spec:

For Misir (already close, keep as-is).
For Yunan, update: `backgroundGradient: ['#eef0f8', '#d4d8e8']`, `arrowIdle: '#1a2848'`
For Roma, update: `backgroundGradient: ['#f0dcc4', '#d8c0a0']`, `arrowIdle: '#5a1810'`, `hintColor: '#c88020'`
For Viking (already close, keep as-is).
For Osmanli (already customized, keep as-is).
For Cin, update: `backgroundGradient: ['#f0d8d0', '#d8b8ac']`, `arrowIdle: '#5a1818'`, `hintColor: '#208060'`
For Maya, update: `backgroundGradient: ['#dcecd4', '#b8d0b0']`, `arrowIdle: '#143018'`, `hintColor: '#209040'`
For Hint, update: `backgroundGradient: ['#f0e0c8', '#d8c4a8']`, `arrowIdle: '#2a1840'`, `hintColor: '#c07020'`
For Ortacag, update: `backgroundGradient: ['#d8d8e0', '#b8b8c0']`, `arrowIdle: '#181820'`, `hintColor: '#c06020'`
For Final, update: `backgroundGradient: ['#e4d8ec', '#c8b8d8']`, `arrowIdle: '#1a1030'`, `hintColor: '#806098'`

- [ ] **Step 2: Commit**

```bash
git add js/data/chapters.js
git commit -m "feat: expand cultural theme color palettes for all 10 chapters"
```

---

### Task 15: Final integration test

**Files:** None (testing only)

- [ ] **Step 1: Run the level generator to ensure all levels still generate**

Run: `node generate-levels.mjs`

Expected: All 50 levels generate without errors.

- [ ] **Step 2: Open the game in browser and test end-to-end**

Test checklist:
- [ ] Menu loads with animated background
- [ ] Chapter selection shows all 10 chapters with correct difficulty labels
- [ ] Story screen shows correctly (images load if present, fallback if not)
- [ ] Level selection works for all chapters
- [ ] Egypt Level 1: arrows mostly point outward (only ~10% traps), easy to solve
- [ ] Roma Level 11: noticeably harder, ~40% edge arrows point inward
- [ ] Final Level 50: very dense, most edge arrows are traps
- [ ] Arrow removal: anticipation pull-back visible, smooth launch, ghost trail
- [ ] Wrong move: red flash, shake, elastic bounce, screen shake
- [ ] Removable arrows: subtle pulse glow visible
- [ ] Touch feedback: brief scale on tap
- [ ] Level complete: shockwave, varied confetti, chapter colors
- [ ] Sound: all 4 sound effects work, toggle button works
- [ ] Screen transitions: smooth fade between screens
- [ ] Zoom/pan: works on game screen

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test fixes for premium upgrade"
```
