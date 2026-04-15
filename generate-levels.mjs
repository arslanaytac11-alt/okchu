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
    1:  { trapRatio: 0.10, chainDepth: 1, density: 0.30, maxPathLen: 6  },
    2:  { trapRatio: 0.30, chainDepth: 2, density: 0.40, maxPathLen: 8  },
    3:  { trapRatio: 0.40, chainDepth: 2, density: 0.45, maxPathLen: 8  },
    4:  { trapRatio: 0.50, chainDepth: 3, density: 0.50, maxPathLen: 10 },
    5:  { trapRatio: 0.60, chainDepth: 3, density: 0.55, maxPathLen: 10 },
    6:  { trapRatio: 0.65, chainDepth: 4, density: 0.60, maxPathLen: 12 },
    7:  { trapRatio: 0.70, chainDepth: 4, density: 0.65, maxPathLen: 12 },
    8:  { trapRatio: 0.75, chainDepth: 5, density: 0.65, maxPathLen: 12 },
    9:  { trapRatio: 0.80, chainDepth: 5, density: 0.70, maxPathLen: 14 },
    10: { trapRatio: 0.85, chainDepth: 6, density: 0.75, maxPathLen: 14 },
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

// ============================================================
// DENSE LEVEL GENERATOR - RANDOM WALK approach
// Creates long, winding arrow paths (4-8 cells) like real puzzle games
// ============================================================

function generateShapedLevel(width, height, mask, seed, difficulty) {
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
    function growPath(startX, startY, targetLen) {
        const cells = [[startX, startY]];
        grid[startY][startX] = pathIdx;

        for (let step = 1; step < targetLen; step++) {
            const [cx, cy] = cells[cells.length - 1];
            const neighbors = freeNeighbors(cx, cy);
            if (neighbors.length === 0) break;

            // Prefer directions that continue the current trajectory (creates longer straight/curved lines)
            let chosen;
            if (cells.length >= 2) {
                const [px, py] = cells[cells.length - 2];
                const dx = cx - px;
                const dy = cy - py;
                // Try to continue same direction (70% chance) for natural curves
                const cont = [cx + dx, cy + dy];
                const contFree = neighbors.find(n => n[0] === cont[0] && n[1] === cont[1]);
                if (contFree && rand() < 0.5) {
                    chosen = contFree;
                } else {
                    chosen = neighbors[Math.floor(rand() * neighbors.length)];
                }
            } else {
                chosen = neighbors[Math.floor(rand() * neighbors.length)];
            }

            cells.push(chosen);
            grid[chosen[1]][chosen[0]] = pathIdx;
        }

        return cells;
    }

    // ALL arrows start pointing INWARD (most blocked direction)
    function pickDirection(cells) {
        const head = cells[cells.length - 1];
        const [hx, hy] = head;
        const dirs = ['up', 'down', 'left', 'right'];

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

    // VARIED path lengths: mix of short (2-3) and long (6-12) for maze-like appearance
    const minLen = 2;
    const maxLen = difficulty > 0.6 ? 12 : difficulty > 0.3 ? 10 : 8;

    // Collect all mask cells and shuffle
    const cellOrder = [];
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (mask[y][x]) cellOrder.push([x, y]);
    for (let i = cellOrder.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cellOrder[i], cellOrder[j]] = [cellOrder[j], cellOrder[i]];
    }

    // Phase 1: Place long paths first
    for (const [x, y] of cellOrder) {
        if (grid[y][x] !== -1) continue;
        const targetLen = minLen + Math.floor(rand() * (maxLen - minLen + 1));
        const cells = growPath(x, y, targetLen);
        if (cells.length >= 2) {
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
    // CH1: MISIR - Kolay + Ogretici (18x14)
    { id: 'egypt_1', chapter: 1, level: 1,  name: 'Piramit',   w: 18, h: 14, shape: 'pyramid',     seedStart: 1000 },
    { id: 'egypt_2', chapter: 1, level: 2,  name: 'Sfenks',    w: 18, h: 14, shape: 'sphinx',      seedStart: 2000 },
    { id: 'egypt_3', chapter: 1, level: 3,  name: 'Elmas',     w: 18, h: 14, shape: 'diamond',     seedStart: 3000 },
    { id: 'egypt_4', chapter: 1, level: 4,  name: 'Basamak',   w: 18, h: 14, shape: 'steppyramid', seedStart: 4000 },
    { id: 'egypt_5', chapter: 1, level: 5,  name: 'Firavun',   w: 18, h: 14, shape: 'solidoval',   seedStart: 5000 },
    // CH2: YUNAN - Orta (20x16)
    { id: 'greek_1', chapter: 2, level: 6,  name: 'Parthenon', w: 20, h: 16, shape: 'temple',      seedStart: 6000 },
    { id: 'greek_2', chapter: 2, level: 7,  name: 'Amphora',   w: 20, h: 16, shape: 'amphora',     seedStart: 7000 },
    { id: 'greek_3', chapter: 2, level: 8,  name: 'Olympia',   w: 20, h: 16, shape: 'diamond',     seedStart: 8000 },
    { id: 'greek_4', chapter: 2, level: 9,  name: 'Akropolis', w: 20, h: 16, shape: 'solidoval',   seedStart: 9000 },
    { id: 'greek_5', chapter: 2, level: 10, name: 'Atina',     w: 20, h: 16, shape: 'steppyramid', seedStart: 10000 },
    // CH3: ROMA - Zor (22x18)
    { id: 'rome_1', chapter: 3, level: 11, name: 'Kolezyum',   w: 22, h: 18, shape: 'arch',        seedStart: 11000 },
    { id: 'rome_2', chapter: 3, level: 12, name: 'Kartal',     w: 22, h: 18, shape: 'eagle',       seedStart: 12000 },
    { id: 'rome_3', chapter: 3, level: 13, name: 'Su Kemeri',  w: 22, h: 18, shape: 'aqueduct',    seedStart: 13000 },
    { id: 'rome_4', chapter: 3, level: 14, name: 'Arena',      w: 22, h: 18, shape: 'oval4',       seedStart: 14000 },
    { id: 'rome_5', chapter: 3, level: 15, name: 'Sezar',      w: 22, h: 18, shape: 'solidoval',   seedStart: 15000 },
    // CH4: VIKING - Zor+ (26x20)
    { id: 'viking_1', chapter: 4, level: 16, name: 'Drakkar',   w: 26, h: 20, shape: 'ship',        seedStart: 16000 },
    { id: 'viking_2', chapter: 4, level: 17, name: 'Mjolnir',   w: 26, h: 20, shape: 'hammer',      seedStart: 17000 },
    { id: 'viking_3', chapter: 4, level: 18, name: 'Runik',     w: 26, h: 20, shape: 'diamond',     seedStart: 18000 },
    { id: 'viking_4', chapter: 4, level: 19, name: 'Fiyort',    w: 26, h: 20, shape: 'solidoval',   seedStart: 19000 },
    { id: 'viking_5', chapter: 4, level: 20, name: 'Valhalla',  w: 26, h: 20, shape: 'steppyramid', seedStart: 20000 },
    // CH5: OSMANLI - Cok Zor (26x22)
    { id: 'ottoman_1', chapter: 5, level: 21, name: 'Cami',     w: 26, h: 22, shape: 'mosque',      seedStart: 21000 },
    { id: 'ottoman_2', chapter: 5, level: 22, name: 'Lale',     w: 26, h: 22, shape: 'tulip',       seedStart: 22000 },
    { id: 'ottoman_3', chapter: 5, level: 23, name: 'Kubbe',    w: 26, h: 22, shape: 'solidoval',   seedStart: 23000 },
    { id: 'ottoman_4', chapter: 5, level: 24, name: 'Minare',   w: 26, h: 22, shape: 'castle',      seedStart: 24000 },
    { id: 'ottoman_5', chapter: 5, level: 25, name: 'Sultan',   w: 26, h: 22, shape: 'diamond',     seedStart: 25000 },
    // CH6: CIN - Cok Zor+ (28x24)
    { id: 'china_1', chapter: 6, level: 26, name: 'Pagoda',     w: 28, h: 24, shape: 'pagoda',      seedStart: 26000 },
    { id: 'china_2', chapter: 6, level: 27, name: 'Ejderha',    w: 28, h: 24, shape: 'dragon',      seedStart: 27000 },
    { id: 'china_3', chapter: 6, level: 28, name: 'Ipek Yolu',  w: 28, h: 24, shape: 'steppyramid', seedStart: 28000 },
    { id: 'china_4', chapter: 6, level: 29, name: 'Sur',        w: 28, h: 24, shape: 'castle',      seedStart: 29000 },
    { id: 'china_5', chapter: 6, level: 30, name: 'Imparator',  w: 28, h: 24, shape: 'solidoval',   seedStart: 30000 },
    // CH7: MAYA - Efsanevi (28x26)
    { id: 'maya_1', chapter: 7, level: 31, name: 'Piramit',     w: 28, h: 26, shape: 'mayapyramid', seedStart: 31000 },
    { id: 'maya_2', chapter: 7, level: 32, name: 'Takvim',      w: 28, h: 26, shape: 'suncalendar', seedStart: 32000 },
    { id: 'maya_3', chapter: 7, level: 33, name: 'Jaguar',      w: 28, h: 26, shape: 'solidoval',   seedStart: 33000 },
    { id: 'maya_4', chapter: 7, level: 34, name: 'Gunes',       w: 28, h: 26, shape: 'diamond',     seedStart: 34000 },
    { id: 'maya_5', chapter: 7, level: 35, name: 'Kukulkan',    w: 28, h: 26, shape: 'steppyramid', seedStart: 35000 },
    // CH8: HINT - Efsanevi+ (30x28)
    { id: 'india_1', chapter: 8, level: 36, name: 'Tac Mahal',  w: 30, h: 28, shape: 'tajmahal',    seedStart: 36000 },
    { id: 'india_2', chapter: 8, level: 37, name: 'Lotus',      w: 30, h: 28, shape: 'lotus',       seedStart: 37000 },
    { id: 'india_3', chapter: 8, level: 38, name: 'Mandala',    w: 30, h: 28, shape: 'solidoval',   seedStart: 38000 },
    { id: 'india_4', chapter: 8, level: 39, name: 'Ganj',       w: 30, h: 28, shape: 'diamond',     seedStart: 39000 },
    { id: 'india_5', chapter: 8, level: 40, name: 'Mogol',      w: 30, h: 28, shape: 'steppyramid', seedStart: 40000 },
    // CH9: ORTACAG - Kabus (32x30)
    { id: 'medieval_1', chapter: 9, level: 41, name: 'Kale',    w: 32, h: 30, shape: 'castle',      seedStart: 41000 },
    { id: 'medieval_2', chapter: 9, level: 42, name: 'Kalkan',   w: 32, h: 30, shape: 'shield',     seedStart: 42000 },
    { id: 'medieval_3', chapter: 9, level: 43, name: 'Katedral', w: 32, h: 30, shape: 'temple',     seedStart: 43000 },
    { id: 'medieval_4', chapter: 9, level: 44, name: 'Simyaci',  w: 32, h: 30, shape: 'solidoval',  seedStart: 44000 },
    { id: 'medieval_5', chapter: 9, level: 45, name: 'Ejderha',  w: 32, h: 30, shape: 'diamond',    seedStart: 45000 },
    // CH10: FINAL - Kabus+ (32x32)
    { id: 'final_1', chapter: 10, level: 46, name: 'Birlesim',  w: 32, h: 32, shape: 'solidoval',   seedStart: 46000 },
    { id: 'final_2', chapter: 10, level: 47, name: 'Portal',    w: 32, h: 32, shape: 'portal',      seedStart: 47000 },
    { id: 'final_3', chapter: 10, level: 48, name: 'Efsane',    w: 32, h: 32, shape: 'mosque',      seedStart: 48000 },
    { id: 'final_4', chapter: 10, level: 49, name: 'Miras',     w: 32, h: 32, shape: 'castle',      seedStart: 49000 },
    { id: 'final_5', chapter: 10, level: 50, name: 'Sonsuzluk', w: 32, h: 32, shape: 'diamond',     seedStart: 50000 },
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
        default: return makeSolidOval(spec.w, spec.h);
    }
}

// ============================================================
// GENERATE ALL LEVELS
// ============================================================

const allLevels = [];

for (const spec of levelSpecs) {
    const mask = getShapeMask(spec);
    const totalCells = countCells(mask);
    console.log(`\n=== ${spec.name} (${spec.w}x${spec.h}, ${totalCells} cells, diff=${spec.diff}) ===`);

    // Print shape
    for (let y = 0; y < spec.h; y++) {
        let row = '  ';
        for (let x = 0; x < spec.w; x++) row += mask[y][x] ? 'X' : '.';
        console.log(row);
    }

    let bestPaths = null;
    let bestSeed = 0;

    for (let seed = spec.seedStart; seed < spec.seedStart + 5000; seed++) {
        const paths = generateShapedLevel(spec.w, spec.h, mask, seed, spec.diff);
        const v = validateLevel(paths, spec.w, spec.h, mask);

        if (v.overlaps > 0 || v.adjErrors > 0 || v.oobErrors > 0) continue;
        if (v.covered < totalCells * 0.98) continue;

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
        return `            { cells: [${cellsStr}], direction: '${p.direction}' }`;
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
