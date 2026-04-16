// Generate dense arrow puzzle levels with SHAPE MASKS
// Difficulty increases per chapter: Egypt=easy, Greek=medium, Rome=hard
// Key: NOT all edge arrows point outward - many point inward for challenge

import { writeFileSync } from 'fs';

function getDirVec(dir) {
    switch (dir) {
        case 'up': return [0, -1];
        case 'down': return [0, 1];
        case 'left': return [-1, 0];
        case 'right': return [1, 0];
    }
}

function isPathClear(paths, pathIdx, removedSet, gridW, gridH) {
    const path = paths[pathIdx];
    const head = path.cells[path.cells.length - 1];
    const [dx, dy] = getDirVec(path.direction);
    let cx = head[0] + dx, cy = head[1] + dy;
    while (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
        for (let i = 0; i < paths.length; i++) {
            if (i === pathIdx || removedSet.has(i)) continue;
            if (paths[i].cells.some(c => c[0] === cx && c[1] === cy)) return false;
        }
        cx += dx; cy += dy;
    }
    return true;
}

function simulateSolve(paths, gridW, gridH) {
    const removed = new Set();
    const order = [];
    let progress = true;
    while (removed.size < paths.length && progress) {
        progress = false;
        for (let i = 0; i < paths.length; i++) {
            if (removed.has(i)) continue;
            if (isPathClear(paths, i, removed, gridW, gridH)) {
                removed.add(i); order.push(i); progress = true;
            }
        }
    }
    return { solved: removed.size === paths.length, order, remaining: paths.length - removed.size };
}

function makeRng(seed) {
    let s = seed;
    return function() {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

// ============================================================
// CHAPTER DIFFICULTY CONFIG
// ============================================================

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

// ============================================================
// SHAPE GENERATORS
// ============================================================

function makePyramid(w, h, tipRow, baseRow) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const center = Math.floor(w / 2);
    const rows = baseRow - tipRow;
    for (let y = tipRow; y <= baseRow; y++) {
        const progress = (y - tipRow) / Math.max(rows, 1);
        const halfWidth = Math.floor(progress * (w / 2 - 1)) + 1;
        for (let x = center - halfWidth; x <= center + halfWidth; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makeDiamond(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    for (let y = 0; y < h; y++) {
        const dy = Math.abs(y - cy);
        const halfW = Math.floor((1 - dy / cy) * (w / 2));
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makeStepPyramid(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const center = Math.floor(w / 2);
    const steps = 4;
    const rowsPerStep = Math.floor(h / steps);
    for (let y = 0; y < h; y++) {
        const step = Math.min(Math.floor(y / rowsPerStep), steps - 1);
        const halfWidth = Math.floor((step + 1) / steps * (w / 2));
        for (let x = center - halfWidth; x <= center + halfWidth; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

function makeTemple(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const center = Math.floor(w / 2);
    const pedH = Math.floor(h * 0.25);
    for (let y = 0; y < pedH; y++) {
        const progress = y / Math.max(pedH - 1, 1);
        const halfW = Math.floor(progress * (w / 2 - 1)) + 1;
        for (let x = center - halfW; x <= center + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Entablature
    for (let y = pedH; y < pedH + 2; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    // Columns
    const colStart = pedH + 2;
    const colEnd = h - 2;
    const colWidth = 2;
    const gapWidth = 1;
    const unit = colWidth + gapWidth;
    const numCols = Math.floor((w + gapWidth) / unit);
    const totalColWidth = numCols * colWidth + (numCols - 1) * gapWidth;
    const startX = Math.floor((w - totalColWidth) / 2);
    for (let y = colStart; y < colEnd; y++) {
        for (let col = 0; col < numCols; col++) {
            const cx = startX + col * unit;
            for (let dx = 0; dx < colWidth; dx++) {
                const x = cx + dx;
                if (x >= 0 && x < w) mask[y][x] = true;
            }
        }
    }
    // Stylobate
    for (let y = colEnd; y < h; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    return mask;
}

function makeArch(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    for (let y = 0; y < 3; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    const wallThick = Math.max(3, Math.floor(w * 0.25));
    for (let y = 3; y < h - 2; y++) {
        for (let x = 0; x < wallThick; x++) mask[y][x] = true;
        for (let x = w - wallThick; x < w; x++) mask[y][x] = true;
    }
    for (let y = h - 2; y < h; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    return mask;
}

function makeAqueduct(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    for (let y = 0; y < 3; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    const pillarW = 3;
    const archW = 3;
    const unit = pillarW + archW;
    for (let y = 3; y < h - 2; y++) {
        for (let px = 0; px < w; px += unit) {
            for (let dx = 0; dx < pillarW && px + dx < w; dx++) {
                mask[y][px + dx] = true;
            }
        }
        // ensure last pillar
        for (let x = Math.max(0, w - pillarW); x < w; x++) mask[y][x] = true;
    }
    for (let y = h - 2; y < h; y++)
        for (let x = 0; x < w; x++) mask[y][x] = true;
    return mask;
}

// Viking longship shape (crescent boat)
function makeShip(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = w / 2;
    const hullTop = Math.floor(h * 0.3);
    const hullBot = h - 2;
    // Mast (vertical line in center)
    for (let y = 0; y < hullTop; y++) {
        const mx = Math.floor(cx);
        mask[y][mx] = true;
        if (mx + 1 < w) mask[y][mx + 1] = true;
    }
    // Hull (crescent - wider in middle, tapered at ends)
    for (let y = hullTop; y <= hullBot; y++) {
        const progress = (y - hullTop) / (hullBot - hullTop);
        const thickness = Math.floor(2 + progress * (h * 0.25));
        const taperY = Math.abs(progress - 0.5) * 2; // 1 at ends, 0 at middle
        const halfW = Math.floor((1 - taperY * 0.6) * (w / 2 - 1)) + 1;
        for (let x = Math.floor(cx) - halfW; x <= Math.floor(cx) + halfW; x++) {
            if (x >= 0 && x < w) {
                // Only fill the hull thickness from the bottom curve
                const distFromCenter = Math.abs(x - cx) / halfW;
                const curveDepth = Math.floor(thickness * (1 - distFromCenter * distFromCenter));
                if (y >= hullBot - curveDepth || y <= hullTop + 2) {
                    mask[y][x] = true;
                }
            }
        }
    }
    // Bottom keel
    for (let x = Math.floor(cx) - 2; x <= Math.floor(cx) + 2; x++) {
        if (x >= 0 && x < w) mask[h - 1][x] = true;
    }
    // Fill hull solid
    for (let y = hullTop; y <= hullBot; y++) {
        let left = -1, right = -1;
        for (let x = 0; x < w; x++) if (mask[y][x]) { left = x; break; }
        for (let x = w - 1; x >= 0; x--) if (mask[y][x]) { right = x; break; }
        if (left >= 0 && right >= 0) {
            for (let x = left; x <= right; x++) mask[y][x] = true;
        }
    }
    return mask;
}

// Ottoman mosque shape (dome + rectangle base + minaret towers)
function makeMosque(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Dome (top semicircle)
    const domeH = Math.floor(h * 0.4);
    const domeR = Math.floor(w * 0.3);
    for (let y = 0; y < domeH; y++) {
        const dy = (domeH - y) / domeH;
        const halfW = Math.floor(Math.sqrt(1 - dy * dy) * domeR);
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Main body (wide rectangle)
    const bodyStart = domeH;
    const bodyEnd = h - 1;
    const bodyHalfW = Math.floor(w * 0.35);
    for (let y = bodyStart; y <= bodyEnd; y++) {
        for (let x = cx - bodyHalfW; x <= cx + bodyHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Minarets (thin towers on sides)
    const minW = 2;
    const minLeft = Math.max(0, cx - bodyHalfW - minW - 1);
    const minRight = Math.min(w - minW, cx + bodyHalfW + 2);
    for (let y = Math.floor(h * 0.15); y <= bodyEnd; y++) {
        for (let dx = 0; dx < minW; dx++) {
            if (minLeft + dx < w) mask[y][minLeft + dx] = true;
            if (minRight + dx < w) mask[y][minRight + dx] = true;
        }
    }
    return mask;
}

// Chinese pagoda (stacked rectangles getting narrower, more steps than step pyramid)
function makePagoda(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const floors = 6;
    const floorH = Math.floor(h / floors);
    for (let f = 0; f < floors; f++) {
        const yStart = f * floorH;
        const yEnd = Math.min((f + 1) * floorH, h);
        const halfW = Math.floor((floors - f) / floors * (w / 2 - 1)) + 2;
        // Roof overhang (first row wider)
        for (let x = cx - halfW - 1; x <= cx + halfW + 1; x++) {
            if (x >= 0 && x < w) mask[yStart][x] = true;
        }
        // Body
        for (let y = yStart + 1; y < yEnd; y++) {
            for (let x = cx - halfW; x <= cx + halfW; x++) {
                if (x >= 0 && x < w) mask[y][x] = true;
            }
        }
    }
    return mask;
}

// Maya step pyramid (many thin steps, steep)
function makeMayaPyramid(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const steps = 8;
    const stepH = Math.max(2, Math.floor(h / steps));
    for (let s = 0; s < steps; s++) {
        const yStart = s * stepH;
        const yEnd = Math.min((s + 1) * stepH, h);
        const halfW = Math.floor((s + 1) / steps * (w / 2));
        for (let y = yStart; y < yEnd; y++) {
            for (let x = cx - halfW; x <= cx + halfW; x++) {
                if (x >= 0 && x < w) mask[y][x] = true;
            }
        }
    }
    return mask;
}

// Taj Mahal shape (dome + body + base platform)
function makeTajMahal(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Spire
    mask[0][cx] = true;
    if (cx + 1 < w) mask[0][cx + 1] = true;
    // Main dome (top 35%)
    const domeH = Math.floor(h * 0.35);
    const domeR = Math.floor(w * 0.28);
    for (let y = 1; y <= domeH; y++) {
        const dy = (domeH - y) / domeH;
        const halfW = Math.floor(Math.sqrt(Math.max(0, 1 - dy * dy)) * domeR);
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Body (rectangle, ~40% of height)
    const bodyEnd = Math.floor(h * 0.8);
    const bodyHalfW = Math.floor(w * 0.35);
    for (let y = domeH + 1; y <= bodyEnd; y++) {
        for (let x = cx - bodyHalfW; x <= cx + bodyHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Base platform (wider)
    for (let y = bodyEnd + 1; y < h; y++) {
        for (let x = 1; x < w - 1; x++) mask[y][x] = true;
    }
    return mask;
}

// Medieval castle (rectangle with corner towers and crenellations)
function makeCastle(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const towerW = Math.max(3, Math.floor(w * 0.15));
    const towerH = Math.floor(h * 0.35);
    // Towers (4 corners)
    for (let y = 0; y < towerH; y++) {
        for (let x = 0; x < towerW; x++) mask[y][x] = true;
        for (let x = w - towerW; x < w; x++) mask[y][x] = true;
    }
    // Crenellations on top wall
    for (let x = towerW; x < w - towerW; x++) {
        if (x % 3 !== 0) { // gaps every 3rd cell
            mask[towerH - 3][x] = true;
            mask[towerH - 2][x] = true;
        }
        mask[towerH - 1][x] = true;
    }
    // Main wall (full width)
    for (let y = towerH; y < h; y++) {
        for (let x = 0; x < w; x++) mask[y][x] = true;
    }
    // Gate (opening in bottom center)
    const gateW = Math.max(3, Math.floor(w * 0.15));
    const gateH = Math.floor(h * 0.25);
    const gateStart = Math.floor(w / 2 - gateW / 2);
    for (let y = h - gateH; y < h - 1; y++) {
        for (let x = gateStart; x < gateStart + gateW; x++) {
            mask[y][x] = false;
        }
    }
    return mask;
}

// Full filled oval (solid, no hole)
function makeSolidOval(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            if (dx * dx + dy * dy <= 1.0) mask[y][x] = true;
        }
    }
    return mask;
}

function makeOval(w, h, thickness) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    const rxI = rx - thickness;
    const ryI = ry - thickness;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const outer = dx * dx + dy * dy;
            if (rxI <= 0 || ryI <= 0) {
                if (outer <= 1.0) mask[y][x] = true;
            } else {
                const dxI = (x - cx) / rxI;
                const dyI = (y - cy) / ryI;
                const inner = dxI * dxI + dyI * dyI;
                if (outer <= 1.0 && inner >= 1.0) mask[y][x] = true;
            }
        }
    }
    return mask;
}

// Sphinx: head (top 30%, narrow centered), body (wide, bottom 70%), paws at bottom
function makeSphinx(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const headRows = Math.floor(h * 0.3);
    const headHalfW = Math.max(2, Math.floor(w * 0.20));
    for (let y = 0; y < headRows; y++) {
        for (let x = cx - headHalfW; x <= cx + headHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Body (wide horizontal rectangle, bottom 70%)
    const bodyHalfW = Math.floor(w * 0.40);
    for (let y = headRows; y < h - 3; y++) {
        for (let x = cx - bodyHalfW; x <= cx + bodyHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Paws extending forward from body at the bottom (two rectangles)
    const pawW = Math.floor(w * 0.18);
    const pawLeft = cx - bodyHalfW;
    const pawRight = cx + bodyHalfW - pawW;
    for (let y = h - 3; y < h; y++) {
        for (let dx = 0; dx < pawW; dx++) {
            const lx = pawLeft + dx;
            const rx = pawRight + dx;
            if (lx >= 0 && lx < w) mask[y][lx] = true;
            if (rx >= 0 && rx < w) mask[y][rx] = true;
        }
    }
    return mask;
}

// Amphora: narrow rim top, narrow neck, handles at junction, wide belly, narrow foot
function makeAmphora(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    for (let y = 0; y < h; y++) {
        const t = y / (h - 1); // 0=top, 1=bottom
        let halfW;
        if (t < 0.08) {
            // Rim: wider flat top
            halfW = Math.floor(w * 0.20);
        } else if (t < 0.22) {
            // Neck: wider
            halfW = Math.floor(w * 0.14);
        } else if (t < 0.30) {
            // Neck-body junction: transition
            halfW = Math.floor(w * 0.14 + (t - 0.22) / 0.08 * w * 0.16);
        } else if (t < 0.72) {
            // Belly: wide, widest at 55% using sine curve
            const bellyt = (t - 0.30) / 0.42;
            halfW = Math.floor(w * (0.28 + Math.sin(bellyt * Math.PI) * 0.26));
        } else if (t < 0.87) {
            // Taper toward foot
            halfW = Math.floor(w * (0.28 - (t - 0.72) / 0.15 * 0.18));
        } else {
            // Foot: narrow
            halfW = Math.floor(w * 0.12);
        }
        halfW = Math.max(1, halfW);
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Handles/ears at neck-body junction (rows ~22-32% height)
    const handleTop = Math.floor(h * 0.20);
    const handleBot = Math.floor(h * 0.35);
    const handleX = Math.floor(w * 0.12);
    for (let y = handleTop; y <= handleBot; y++) {
        const hx1 = cx - Math.floor(w * 0.2);
        const hx2 = cx + Math.floor(w * 0.2);
        if (hx1 >= 0) mask[y][hx1] = true;
        if (hx1 - 1 >= 0) mask[y][hx1 - 1] = true;
        if (hx2 < w) mask[y][hx2] = true;
        if (hx2 + 1 < w) mask[y][hx2 + 1] = true;
    }
    return mask;
}

// Eagle: small head top, vertical body center, wide spread wings, V-shaped tail bottom
function makeEagle(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // Head (small circle at top ~8% height)
    const headR = Math.max(2, Math.floor(w * 0.10));
    const headCy = Math.floor(h * 0.07);
    for (let y = 0; y < Math.floor(h * 0.16); y++) {
        const dy = y - headCy;
        const hw = Math.floor(Math.sqrt(Math.max(0, headR * headR - dy * dy)));
        for (let x = cx - hw; x <= cx + hw; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Body (vertical center strip, full height)
    const bodyHalfW = Math.max(2, Math.floor(w * 0.12));
    for (let y = 0; y < h; y++) {
        for (let x = cx - bodyHalfW; x <= cx + bodyHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Wings: span nearly full height, widest at 35% height
    const wingTop = 0;
    const wingBot = Math.floor(h * 0.80);
    const wingWidestY = Math.floor(h * 0.35);
    for (let y = wingTop; y <= wingBot; y++) {
        let halfW;
        if (y <= wingWidestY) {
            halfW = Math.floor((y + 1) / Math.max(1, wingWidestY + 1) * (w / 2 - 1));
        } else {
            halfW = Math.floor((1 - (y - wingWidestY) / Math.max(1, wingBot - wingWidestY)) * (w / 2 - 1));
        }
        halfW = Math.max(bodyHalfW, halfW);
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // V-shaped tail at bottom (filled wide wedge)
    const tailTop = Math.floor(h * 0.68);
    const tailHalfW = Math.floor(w * 0.42);
    for (let y = tailTop; y < h; y++) {
        const t = (y - tailTop) / Math.max(1, h - 1 - tailTop);
        const spread = Math.floor(t * tailHalfW);
        for (let x = cx - spread; x <= cx + spread; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

// Hammer (Mjolnir): wide head top, narrow handle center, slightly wider grip bottom
function makeHammer(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const headH = Math.floor(h * 0.40);
    const headHalfW = Math.floor(w * 0.46);
    // Head (wide rectangle at top)
    for (let y = 0; y < headH; y++) {
        for (let x = cx - headHalfW; x <= cx + headHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Handle (center, 60% height)
    const handleHalfW = Math.max(3, Math.floor(w * 0.14));
    for (let y = headH; y < h - 4; y++) {
        for (let x = cx - handleHalfW; x <= cx + handleHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Grip (wider at very bottom)
    const gripHalfW = Math.floor(w * 0.22);
    for (let y = h - 4; y < h; y++) {
        for (let x = cx - gripHalfW; x <= cx + gripHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

// Tulip: 3 overlapping petal ovals at top, narrow stem, small leaf bumps, narrow base
function makeTulip(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const petalBotY = Math.floor(h * 0.55);
    // 3 petals (center + left + right, overlapping ovals)
    const petalH = Math.floor(h * 0.50);
    const petalRx = Math.floor(w * 0.23);
    const petalRy = Math.floor(petalH / 2);
    const petalCy = Math.floor(h * 0.26);
    const offsets = [0, -Math.floor(w * 0.20), Math.floor(w * 0.20)];
    for (const ox of offsets) {
        const pcx = cx + ox;
        for (let y = 0; y < petalBotY; y++) {
            const dy = (y - petalCy) / Math.max(1, petalRy);
            if (dy * dy > 1) continue;
            const hw = Math.floor(Math.sqrt(Math.max(0, 1 - dy * dy)) * petalRx);
            for (let x = pcx - hw; x <= pcx + hw; x++) {
                if (x >= 0 && x < w) mask[y][x] = true;
            }
        }
    }
    // Stem (center, from petalBotY to bottom-3)
    const stemHalfW = Math.max(3, Math.floor(w * 0.10));
    for (let y = petalBotY; y < h - 2; y++) {
        for (let x = cx - stemHalfW; x <= cx + stemHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Leaf bumps on sides of stem at ~68% height
    const leafY = Math.floor(h * 0.68);
    const leafW = Math.floor(w * 0.20);
    for (let dy = -4; dy <= 4; dy++) {
        const y = leafY + dy;
        if (y < 0 || y >= h) continue;
        const spread = Math.floor(leafW * (1 - Math.abs(dy) / 5));
        for (let dx = 1; dx <= spread; dx++) {
            if (cx - stemHalfW - dx >= 0) mask[y][cx - stemHalfW - dx] = true;
            if (cx + stemHalfW + dx < w) mask[y][cx + stemHalfW + dx] = true;
        }
    }
    // Base
    const baseHalfW = Math.floor(w * 0.16);
    for (let y = h - 3; y < h; y++) {
        for (let x = cx - baseHalfW; x <= cx + baseHalfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

// Dragon: S-curve body from top-right to bottom-left, wider head at top, fan tail at bottom
function makeDragon(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    // S-curve body: thicker for good coverage
    const bodyHalfW = Math.max(5, Math.floor(w * 0.22));
    for (let y = 0; y < h; y++) {
        const t = y / (h - 1);
        // At top lean right, at bottom lean left (S-curve)
        const linearShift = Math.floor((0.5 - t) * (w * 0.30));
        const bx = cx + linearShift + Math.floor(Math.sin(t * Math.PI * 1.5) * (w * 0.08));
        let hw = bodyHalfW;
        // Head: wider at top 20%
        if (t < 0.20) hw = Math.floor(bodyHalfW * (1 + (0.20 - t) / 0.20 * 0.8));
        for (let x = bx - hw; x <= bx + hw; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    // Fan tail at bottom: spread out from bottom-left area
    const tailTop = Math.floor(h * 0.68);
    const tailCx = Math.floor(w * 0.32);
    for (let y = tailTop; y < h; y++) {
        const spread = Math.floor((y - tailTop) / Math.max(1, h - 1 - tailTop) * (w * 0.42));
        for (let x = tailCx - spread; x <= tailCx + spread; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

// Sun Calendar: thick outer oval ring, inner circle, cross spokes N-S-E-W
function makeSunCalendar(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    const thickness = Math.max(4, Math.floor(Math.min(w, h) * 0.15));
    const rxI = rx - thickness;
    const ryI = ry - thickness;
    // Outer ring
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const outer = dx * dx + dy * dy;
            if (outer > 1.0) continue;
            if (rxI <= 0 || ryI <= 0) {
                mask[y][x] = true;
            } else {
                const dxI = (x - cx) / rxI;
                const dyI = (y - cy) / ryI;
                const inner = dxI * dxI + dyI * dyI;
                if (inner >= 1.0) mask[y][x] = true;
            }
        }
    }
    // Inner circle at center
    const innerR = Math.floor(Math.min(rxI, ryI) * 0.55);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy <= innerR * innerR) mask[y][x] = true;
        }
    }
    // Cross spokes (N-S-E-W lines connecting inner circle to outer ring)
    const spokeW = Math.max(2, Math.floor(Math.min(w, h) * 0.07));
    for (let y = 0; y < h; y++) {
        for (let sw = -spokeW; sw <= spokeW; sw++) {
            const x = Math.round(cx) + sw;
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    for (let x = 0; x < w; x++) {
        for (let sw = -spokeW; sw <= spokeW; sw++) {
            const y = Math.round(cy) + sw;
            if (y >= 0 && y < h) mask[y][x] = true;
        }
    }
    // Clip all filled cells to be within outer oval
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (mask[y][x]) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                if (dx * dx + dy * dy > 1.0) mask[y][x] = false;
            }
        }
    }
    return mask;
}

// Lotus: 5 petals radiating upward from center point, wide shallow arc base
function makeLotus(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const originY = Math.floor(h * 0.46); // petals radiate from here
    const petalLen = Math.floor(h * 0.44);
    const petalW = Math.max(4, Math.floor(w * 0.14));
    // 5 petals: angles spread from -60 to +60 degrees upward
    const angles = [-60, -30, 0, 30, 60].map(a => a * Math.PI / 180);
    for (const angle of angles) {
        // Petal axis direction (upward with angle offset)
        const ax = Math.sin(angle);
        const ay = -Math.cos(angle); // negative because y increases downward
        // Draw petal as a filled oval along the axis
        for (let step = 0; step <= petalLen; step++) {
            const t = step / petalLen;
            const px = cx + ax * step;
            const py = originY + ay * step;
            // Width tapers at tip
            const hw = Math.floor(petalW * Math.sin(t * Math.PI));
            // Perpendicular direction
            const px1 = -ay, py1 = ax;
            for (let s = -hw; s <= hw; s++) {
                const fx = Math.round(px + px1 * s);
                const fy = Math.round(py + py1 * s);
                if (fx >= 0 && fx < w && fy >= 0 && fy < h) mask[fy][fx] = true;
            }
        }
    }
    // Wide arc base at bottom (fill most of bottom half)
    const baseY = originY;
    const baseR = Math.floor(w * 0.49);
    for (let x = 0; x < w; x++) {
        for (let y = baseY; y < h; y++) {
            const dx = x - cx;
            const dy = y - baseY;
            // Wider ellipse: dy factor < 1 makes it taller relative to width
            if (dx * dx + (dy * 1.2) * (dy * 1.2) <= baseR * baseR) mask[y][x] = true;
        }
    }
    return mask;
}

// Shield: flat/wide top, tapering via quadratic curve to point at bottom
function makeShield(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = Math.floor(w / 2);
    const flatRows = Math.floor(h * 0.3);
    // Flat top section
    for (let y = 0; y < flatRows; y++) {
        for (let x = 1; x < w - 1; x++) mask[y][x] = true;
    }
    // Taper section: quadratic curve to point at bottom
    for (let y = flatRows; y < h; y++) {
        const t = (y - flatRows) / Math.max(1, h - 1 - flatRows); // 0=top of taper, 1=point
        // Quadratic: halfW goes from (w/2-1) to 0
        const halfW = Math.floor((1 - t * t) * (w / 2 - 1));
        for (let x = cx - halfW; x <= cx + halfW; x++) {
            if (x >= 0 && x < w) mask[y][x] = true;
        }
    }
    return mask;
}

// Portal: thick oval ring (thickness 5), diagonal X cross pattern inside
function makePortal(w, h) {
    const mask = Array.from({ length: h }, () => Array(w).fill(false));
    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const rx = (w - 1) / 2;
    const ry = (h - 1) / 2;
    const thickness = 5;
    const rxI = rx - thickness;
    const ryI = ry - thickness;
    // Thick oval ring
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const outer = dx * dx + dy * dy;
            if (outer > 1.0) continue;
            if (rxI <= 0 || ryI <= 0) {
                mask[y][x] = true;
            } else {
                const dxI = (x - cx) / rxI;
                const dyI = (y - cy) / ryI;
                const inner = dxI * dxI + dyI * dyI;
                if (inner >= 1.0) mask[y][x] = true;
            }
        }
    }
    // Diagonal X cross pattern inside (only within the inner oval)
    const crossW = Math.max(2, Math.floor(Math.min(w, h) * 0.09));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rxI;
            const dy = (y - cy) / ryI;
            if (rxI <= 0 || ryI <= 0 || dx * dx + dy * dy < 1.0) {
                // Check if on an X diagonal
                const adx = Math.abs((x - cx) - (y - cy));
                const sdx = Math.abs((x - cx) + (y - cy));
                if (adx <= crossW || sdx <= crossW) mask[y][x] = true;
            }
        }
    }
    // Clip to outer oval
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (mask[y][x]) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                if (dx * dx + dy * dy > 1.0) mask[y][x] = false;
            }
        }
    }
    return mask;
}

// ============================================================
// SHAPE EDGE / DIRECTION HELPERS
// ============================================================

function cellIsOnShapeEdge(x, y, mask, width, height) {
    const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny][nx]) {
            return true;
        }
    }
    return false;
}

function mostBlockedDirection(hx, hy, mask, width, height) {
    const dirs = ['up', 'down', 'left', 'right'];
    let bestDir = dirs[0];
    let bestCount = -1;
    for (const d of dirs) {
        const [dx, dy] = getDirVec(d);
        let cx = hx + dx, cy = hy + dy;
        let count = 0;
        while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            if (mask[cy][cx]) count++;
            cx += dx; cy += dy;
        }
        if (count > bestCount) {
            bestCount = count;
            bestDir = d;
        }
    }
    return bestDir;
}

function leastBlockedDirection(hx, hy, mask, width, height) {
    const dirs = ['up', 'down', 'left', 'right'];
    let bestDir = dirs[0];
    let bestCount = Infinity;
    for (const d of dirs) {
        const [dx, dy] = getDirVec(d);
        let cx = hx + dx, cy = hy + dy;
        let count = 0;
        while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            if (mask[cy][cx]) count++;
            cx += dx; cy += dy;
        }
        if (count < bestCount) {
            bestCount = count;
            bestDir = d;
        }
    }
    return bestDir;
}

// ============================================================
// DENSE LEVEL GENERATOR - RANDOM WALK approach
// Creates long, winding arrow paths (4-8 cells) like real puzzle games
// ============================================================

function generateShapedLevel(width, height, mask, seed, chapterNum) {
    const grid = Array.from({ length: height }, () => Array(width).fill(-1));
    const paths = [];
    let pathIdx = 0;
    const rand = makeRng(seed);

    function isFree(x, y) {
        return x >= 0 && x < width && y >= 0 && y < height && mask[y][x] && grid[y][x] === -1;
    }

    // Get free adjacent neighbors of (x,y)
    function freeNeighbors(x, y) {
        const n = [];
        if (isFree(x-1, y)) n.push([x-1, y]);
        if (isFree(x+1, y)) n.push([x+1, y]);
        if (isFree(x, y-1)) n.push([x, y-1]);
        if (isFree(x, y+1)) n.push([x, y+1]);
        return n;
    }

    // Random walk to create a winding path of target length
    // turnChance controls how often the path changes direction (higher = more L/U/S shapes)
    function growPath(startX, startY, targetLen) {
        const cells = [[startX, startY]];
        grid[startY][startX] = pathIdx;
        const tc = config.turnChance || 0.5;

        for (let step = 1; step < targetLen; step++) {
            const [cx, cy] = cells[cells.length - 1];
            const neighbors = freeNeighbors(cx, cy);
            if (neighbors.length === 0) break;

            let chosen;
            if (cells.length >= 2) {
                const [px, py] = cells[cells.length - 2];
                const dx = cx - px;
                const dy = cy - py;
                const cont = [cx + dx, cy + dy];
                const contFree = neighbors.find(n => n[0] === cont[0] && n[1] === cont[1]);
                // Use turnChance: higher value = more likely to turn instead of continuing straight
                if (contFree && rand() >= tc) {
                    // Continue straight
                    chosen = contFree;
                } else {
                    // Turn: pick from neighbors that are NOT the straight continuation
                    const turnNeighbors = neighbors.filter(n => !(n[0] === cont[0] && n[1] === cont[1]));
                    if (turnNeighbors.length > 0) {
                        chosen = turnNeighbors[Math.floor(rand() * turnNeighbors.length)];
                    } else {
                        // No turn options available, continue straight or pick any
                        chosen = contFree || neighbors[Math.floor(rand() * neighbors.length)];
                    }
                }
            } else {
                chosen = neighbors[Math.floor(rand() * neighbors.length)];
            }

            cells.push(chosen);
            grid[chosen[1]][chosen[0]] = pathIdx;
        }

        return cells;
    }

    const config = CHAPTER_CONFIG[chapterNum] || CHAPTER_CONFIG[1];

    function pickDirection(cells) {
        const head = cells[cells.length - 1];
        const [hx, hy] = head;
        const dirs = ['up', 'down', 'left', 'right'];

        if (cellIsOnShapeEdge(hx, hy, mask, width, height)) {
            // Edge cell: trapRatio chance to point inward (trap), otherwise point outward (easy)
            if (rand() < config.trapRatio) {
                return mostBlockedDirection(hx, hy, mask, width, height);
            } else {
                return leastBlockedDirection(hx, hy, mask, width, height);
            }
        }

        // Interior cell: weighted random (60% most blocked, 30% second, 10% third)
        const costs = dirs.map(d => {
            const [dx, dy] = getDirVec(d);
            let cx = hx + dx, cy = hy + dy;
            let maskCells = 0;
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
        return costs[2].dir;
    }

    // VARIED path lengths driven by chapter config with weighted distribution
    const maxLen = config.maxPathLen;

    // Weighted path length picker: mix of short, medium, and long paths.
    // Early chapters (low chapterNum) favor short paths; later chapters favor long.
    // chapterProgress goes from 0.0 (ch1) to 1.0 (ch10).
    const chapterProgress = (chapterNum - 1) / 9;
    // Weight buckets: short (1-2), medium (3-5), long (6+)
    const shortWeight = Math.max(0.10, 0.45 - chapterProgress * 0.35);  // 0.45 -> 0.10
    const longWeight  = Math.max(0.10, 0.10 + chapterProgress * 0.45);  // 0.10 -> 0.55
    const medWeight   = 1.0 - shortWeight - longWeight;                  // remainder

    function pickTargetLen() {
        const r = rand();
        if (r < shortWeight) {
            // Short: 1 or 2 cells
            return 1 + Math.floor(rand() * 2); // 1-2
        } else if (r < shortWeight + medWeight) {
            // Medium: 3 to min(5, maxLen)
            const medMax = Math.min(5, maxLen);
            return 3 + Math.floor(rand() * (medMax - 3 + 1)); // 3-5
        } else {
            // Long: 6 to maxLen (clamped to at least 6)
            const longMin = Math.min(6, maxLen);
            return longMin + Math.floor(rand() * (maxLen - longMin + 1)); // 6-maxLen
        }
    }

    // Collect all mask cells and shuffle
    const cellOrder = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (mask[y][x]) cellOrder.push([x, y]);
    for (let i = cellOrder.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cellOrder[i], cellOrder[j]] = [cellOrder[j], cellOrder[i]];
    }

    // Phase 0: Guarantee at least 1 single-cell arrow and 1 long arrow per level
    let placedSingle = false;
    let placedLong = false;
    for (const [x, y] of cellOrder) {
        if (grid[y][x] !== -1) continue;
        if (!placedSingle) {
            // Force a single-cell arrow for a quick win
            const cells = growPath(x, y, 1);
            const dir = pickDirection(cells);
            paths.push({ cells, direction: dir });
            pathIdx++;
            placedSingle = true;
            continue;
        }
        if (!placedLong) {
            // Force a long winding arrow for challenge
            const longTarget = maxLen;
            const cells = growPath(x, y, longTarget);
            const dir = pickDirection(cells);
            paths.push({ cells, direction: dir });
            pathIdx++;
            placedLong = true;
            continue;
        }
        break;
    }

    // Phase 1: Place paths with weighted length distribution
    for (const [x, y] of cellOrder) {
        if (grid[y][x] !== -1) continue;
        const targetLen = pickTargetLen();
        const cells = growPath(x, y, targetLen);
        if (cells.length >= 2) {
            const dir = pickDirection(cells);
            paths.push({ cells, direction: dir });
            pathIdx++;
        } else if (cells.length === 1) {
            // Single-cell arrows are valid quick-win elements
            const dir = pickDirection(cells);
            paths.push({ cells, direction: dir });
            pathIdx++;
        }
    }

    // Phase 2: Fill remaining isolated cells by trying to attach to neighbors or making 1-cell arrows
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!mask[y][x] || grid[y][x] !== -1) continue;
            // Try to grow even a small path
            const cells = growPath(x, y, 3);
            const dir = pickDirection(cells);
            paths.push({ cells, direction: dir });
            pathIdx++;
        }
    }

    return paths;
}

function fixSolvability(paths, width, height, maxAttempts) {
    const dirs = ['up', 'down', 'left', 'right'];

    // Phase 1: Make it solvable by flipping stuck arrows
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = simulateSolve(paths, width, height);
        if (result.solved) break;

        const removed = new Set(result.order);
        const stuck = [];
        for (let i = 0; i < paths.length; i++) {
            if (!removed.has(i)) stuck.push(i);
        }

        let improved = false;
        for (const si of stuck) {
            const origDir = paths[si].direction;
            let bestDir = origDir;
            let bestCount = result.order.length;

            for (const dir of dirs) {
                if (dir === origDir) continue;
                paths[si].direction = dir;
                const test = simulateSolve(paths, width, height);
                if (test.solved) { improved = true; break; }
                if (test.order.length > bestCount) {
                    bestCount = test.order.length;
                    bestDir = dir;
                }
            }
            if (improved) break;
            if (bestDir !== origDir) {
                paths[si].direction = bestDir;
                improved = true;
                break;
            }
            paths[si].direction = origDir;
        }
        if (!improved) break;
    }

    if (!simulateSolve(paths, width, height).solved) return false;

    // Phase 2: HARDEN - flip removable arrows back to inward directions
    // This minimizes the number of immediately-removable arrows
    for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < paths.length; i++) {
            if (!isPathClear(paths, i, new Set(), width, height)) continue;
            // This arrow is immediately removable - try to make it NOT removable
            const origDir = paths[i].direction;
            const head = paths[i].cells[paths[i].cells.length - 1];
            const [hx, hy] = head;

            // Find most-blocked direction for this arrow
            const costs = dirs.map(d => {
                const [dx, dy] = getDirVec(d);
                let cx = hx + dx, cy = hy + dy;
                let n = 0;
                while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                    for (let j = 0; j < paths.length; j++) {
                        if (j === i) continue;
                        if (paths[j].cells.some(c => c[0] === cx && c[1] === cy)) { n++; break; }
                    }
                    cx += dx; cy += dy;
                }
                return { dir: d, n };
            });
            costs.sort((a, b) => b.n - a.n);

            // Try flipping to most-blocked direction
            for (const { dir } of costs) {
                if (dir === origDir) continue;
                paths[i].direction = dir;
                if (simulateSolve(paths, width, height).solved) break; // keep new dir
                paths[i].direction = origDir; // revert
            }
        }
    }

    return simulateSolve(paths, width, height).solved;
}

function countCells(mask) {
    let n = 0;
    for (const row of mask) for (const c of row) if (c) n++;
    return n;
}

function validateLevel(paths, width, height, mask) {
    const cellSet = new Set();
    let overlaps = 0, adjErrors = 0, oobErrors = 0;
    for (const p of paths) {
        for (const [x, y] of p.cells) {
            const key = `${x},${y}`;
            if (cellSet.has(key)) overlaps++;
            cellSet.add(key);
            if (x < 0 || x >= width || y < 0 || y >= height) oobErrors++;
        }
        for (let i = 1; i < p.cells.length; i++) {
            const [x1, y1] = p.cells[i-1];
            const [x2, y2] = p.cells[i];
            if (Math.abs(x2-x1) + Math.abs(y2-y1) !== 1) adjErrors++;
        }
    }
    const target = mask ? countCells(mask) : width * height;
    return { overlaps, adjErrors, oobErrors, covered: cellSet.size, target };
}

// ============================================================
// LEVEL SPECIFICATIONS
// Difficulty increases: Egypt(0.1-0.3), Greek(0.4-0.6), Rome(0.7-0.9)
// Grid sizes increase within and across chapters
// ============================================================

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

// ============================================================
// GENERATE ALL LEVELS
// ============================================================

function assignMechanics(paths, chapterNum) {
    const shuffled = [...paths].sort(() => Math.random() - 0.5);

    if (chapterNum >= 3) {
        // Armor: ~20% of paths
        const armorCount = Math.floor(paths.length * 0.2);
        for (let i = 0; i < armorCount && i < shuffled.length; i++) {
            shuffled[i]._armor = 2;
        }
    }

    if (chapterNum >= 4) {
        // Freeze sources: ~25% of non-armored paths
        const candidates = paths.filter(p => !p._armor);
        const freezeCount = Math.floor(candidates.length * 0.25);
        const fShuffle = candidates.sort(() => Math.random() - 0.5);
        for (let i = 0; i < freezeCount && i < fShuffle.length; i++) {
            fShuffle[i]._freezeSource = true;
        }
    }

    if (chapterNum >= 5) {
        // Chain groups: pair adjacent same-color paths
        let groupId = 0;
        const ungrouped = paths.filter(p => !p._armor && !p._freezeSource && !p._chainGroup);
        for (let i = 0; i < ungrouped.length; i++) {
            if (ungrouped[i]._chainGroup) continue;
            const group = [ungrouped[i]];
            for (let j = i + 1; j < ungrouped.length && group.length < 3; j++) {
                if (ungrouped[j]._chainGroup) continue;
                if (ungrouped[j].colorIndex === ungrouped[i].colorIndex) {
                    const adjacent = group.some(gp =>
                        gp.cells.some(gc =>
                            ungrouped[j].cells.some(jc =>
                                Math.abs(gc[0] - jc[0]) + Math.abs(gc[1] - jc[1]) === 1
                            )
                        )
                    );
                    if (adjacent) group.push(ungrouped[j]);
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
        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
        let mirrorId = 0;
        const unpaired = paths.filter(p => !p._armor && !p._freezeSource && !p._chainGroup && !p._mirrorPair);
        const maxPairs = Math.floor(paths.length * 0.15);
        for (let i = 0; i < unpaired.length && mirrorId < maxPairs; i++) {
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
        }
    }
}

const allLevels = [];

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

    // Assign mechanics based on chapter
    assignMechanics(bestPaths, spec.chapter);

    const v = validateLevel(bestPaths, spec.w, spec.h, mask);
    const result = simulateSolve(bestPaths, spec.w, spec.h);

    // Count initially removable arrows
    const initialFree = bestPaths.filter((_, i) => isPathClear(bestPaths, i, new Set(), spec.w, spec.h)).length;

    const sizes = {};
    bestPaths.forEach(p => { sizes[p.cells.length] = (sizes[p.cells.length] || 0) + 1; });
    const sizeStr = Object.entries(sizes).sort((a,b) => b[0]-a[0]).map(([s,c]) => `${s}:${c}`).join(' ');

    console.log(`  Seed: ${bestSeed}, Paths: ${bestPaths.length}, Coverage: ${v.covered}/${totalCells}`);
    console.log(`  Initially removable: ${initialFree}/${bestPaths.length} (${(initialFree/bestPaths.length*100).toFixed(0)}%)`);
    console.log(`  Sizes: ${sizeStr}`);

    allLevels.push({ ...spec, paths: bestPaths });
}

// ============================================================
// OUTPUT FILES
// ============================================================

function formatLevel(level) {
    const pathStrs = level.paths.map(p => {
        const cellsStr = p.cells.map(c => `[${c[0]},${c[1]}]`).join(',');
        let extra = '';
        if (p._armor) extra += `, armor: ${p._armor}`;
        if (p._freezeSource) extra += `, freezeSource: true`;
        if (p._chainGroup) extra += `, chainGroup: '${p._chainGroup}'`;
        if (p._mirrorPair) extra += `, mirrorPair: '${p._mirrorPair}'`;
        return `            { cells: [${cellsStr}], direction: '${p.direction}'${extra} }`;
    });
    return `    {
        id: '${level.id}',
        chapter: ${level.chapter},
        level: ${level.level},
        name: '${level.name}',
        gridWidth: ${level.w},
        gridHeight: ${level.h},
        paths: [
${pathStrs.join(',\n')}
        ]
    }`;
}

function writeFile(filename, varName, levels) {
    const js = `// ${filename}\n// Auto-generated dense levels with progressive difficulty\n\nexport const ${varName} = [\n${levels.map(formatLevel).join(',\n\n')}\n];\n`;
    writeFileSync(filename, js);
    console.log(`\nWrote ${filename} (${levels.length} levels)`);
}

const chapterFiles = [
    { chapter: 1,  file: 'js/data/levels/egypt.js',    varName: 'egyptLevels' },
    { chapter: 2,  file: 'js/data/levels/greek.js',    varName: 'greekLevels' },
    { chapter: 3,  file: 'js/data/levels/rome.js',     varName: 'romeLevels' },
    { chapter: 4,  file: 'js/data/levels/viking.js',   varName: 'vikingLevels' },
    { chapter: 5,  file: 'js/data/levels/ottoman.js',  varName: 'ottomanLevels' },
    { chapter: 6,  file: 'js/data/levels/china.js',    varName: 'chinaLevels' },
    { chapter: 7,  file: 'js/data/levels/maya.js',     varName: 'mayaLevels' },
    { chapter: 8,  file: 'js/data/levels/india.js',    varName: 'indiaLevels' },
    { chapter: 9,  file: 'js/data/levels/medieval.js',  varName: 'medievalLevels' },
    { chapter: 10, file: 'js/data/levels/final.js',    varName: 'finalLevels' },
];

for (const cf of chapterFiles) {
    const levels = allLevels.filter(l => l.chapter === cf.chapter);
    if (levels.length > 0) writeFile(cf.file, cf.varName, levels);
}

console.log(`\nDone! Generated ${allLevels.length} levels total across ${chapterFiles.length} chapters.`);
