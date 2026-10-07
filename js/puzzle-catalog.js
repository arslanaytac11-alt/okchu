// The campaign uses hand-shaped silhouettes and deterministic path carving.
// This module is also used by the offline generator; generation never runs
// during play. A carved path has a clear exit at the moment it is removed,
// so the recorded peeling order proves a solution before a puzzle is shipped.

export const CAMPAIGN_SHAPES = [
    ['pyramid', 'sphinx', 'diamond', 'steps', 'scarab'],
    ['temple', 'amphora', 'laurel', 'acropolis', 'owl'],
    ['colosseum', 'eagle', 'aqueduct', 'arena', 'crown'],
    ['ship', 'hammer', 'rune', 'mountain', 'helmet'],
    ['mosque', 'tulip', 'dome', 'minaret', 'turban'],
    ['pagoda', 'dragon', 'silk', 'wall', 'fan'],
    ['steps', 'calendar', 'jaguar', 'sun', 'serpent'],
    ['palace', 'lotus', 'mandala', 'river', 'palace'],
    ['castle', 'shield', 'cathedral', 'flask', 'dragon'],
    ['rosette', 'portal', 'trophy', 'jewel', 'infinity'],
];

const DIRS = [
    ['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0],
];
const key = (x, y) => `${x},${y}`;
const rect = (x, y, l, t, r, b) => x >= l && x <= r && y >= t && y <= b;
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const ring = (x, y, rx, ry, width = 0.25) => ellipse(x, y, 0, 0, rx, ry) && !ellipse(x, y, 0, 0, rx - width, ry - width);
const band = (y, center, width) => Math.abs(y - center) <= width;

// Coordinates are normalized to -1..1. Shape boundaries are sampled at cell
// centers, keeping the silhouette stable on every display size.
export function inSilhouette(shape, x, y) {
    const a = Math.abs(x);
    switch (shape) {
        case 'pyramid': return y >= -0.9 && y <= 0.85 && a <= (y + 1) * 0.5;
        case 'sphinx': return ellipse(x, y, -0.15, 0.32, 0.76, 0.4) || rect(x, y, 0.22, -0.5, 0.64, 0.4) || ellipse(x, y, 0.4, -0.5, 0.32, 0.38) || rect(x, y, -0.88, 0.55, 0.82, 0.78);
        case 'diamond': case 'jewel': return a / 0.9 + Math.abs(y) / 0.92 <= 1;
        case 'steps': return y > -0.85 && y < 0.85 && a <= 0.2 + Math.floor((y + 0.9) * 3) * 0.14;
        case 'scarab': return ellipse(x, y, 0, 0.1, 0.57, 0.7) || ellipse(x, y, 0, -0.66, 0.3, 0.25) || (Math.abs(y) < 0.65 && a > 0.45 && a < 0.9 && (band(y, -0.48, 0.12) || band(y, 0.05, 0.12) || band(y, 0.57, 0.12)));
        case 'temple': case 'acropolis': return (y > -0.85 && y < -0.3 && a < (y + 0.95) * 1.65) || rect(x, y, -0.85, -0.3, 0.85, -0.1) || (y > -0.1 && y < 0.7 && (a > 0.58 || a < 0.18)) || rect(x, y, -0.9, 0.65, 0.9, 0.88);
        case 'amphora': return ellipse(x, y, 0, 0.18, 0.58, 0.65) || rect(x, y, -0.32, -0.82, 0.32, -0.32) || (ring(x, y + 0.15, 0.88, 0.43, 0.2) && y < 0.22) || rect(x, y, -0.4, 0.7, 0.4, 0.9);
        case 'laurel': return (ring(x, y, 0.86, 0.87, 0.34) && y > -0.66) || rect(x, y, -0.2, 0.5, 0.2, 0.88);
        case 'owl': return ellipse(x, y, 0, 0.23, 0.65, 0.68) || ellipse(x, y, 0, -0.38, 0.77, 0.44) || (y < -0.5 && y > -0.9 && a > 0.4 && a < 0.72);
        case 'colosseum': case 'arena': return ellipse(x, y, 0, 0, 0.92, 0.76) && !(y > -0.3 && y < 0.36 && (Math.abs(x + 0.52) < 0.12 || a < 0.12 || Math.abs(x - 0.52) < 0.12));
        case 'eagle': return (Math.abs(y + 0.05 + a * 0.55) < 0.25 && a < 0.93) || ellipse(x, y, 0, 0.05, 0.27, 0.78) || rect(x, y, -0.15, 0.55, 0.15, 0.9);
        case 'aqueduct': return rect(x, y, -0.94, -0.66, 0.94, -0.25) || (rect(x, y, -0.94, -0.25, 0.94, 0.8) && (a > 0.73 || a < 0.15 || Math.abs(a - 0.44) < 0.12));
        case 'crown': return rect(x, y, -0.78, 0.05, 0.78, 0.72) || (y > -0.8 && y < 0.1 && (a < (y + 0.92) * 0.38 || Math.abs(a - 0.7) < (y + 0.92) * 0.23));
        case 'ship': return (y > 0.15 && y < 0.74 && a < 0.94 - (y - 0.15) * 0.7) || rect(x, y, -0.14, -0.9, 0.14, 0.38) || (x > 0.03 && x < 0.72 && y > -0.76 && y < 0.02);
        case 'hammer': return rect(x, y, -0.84, -0.78, 0.84, -0.18) || rect(x, y, -0.22, -0.2, 0.22, 0.9);
        case 'rune': return rect(x, y, -0.2, -0.9, 0.2, 0.9) || (y < 0.05 && Math.abs(x - (y + 0.75)) < 0.18) || (y > -0.2 && Math.abs(x + y - 0.45) < 0.18);
        case 'mountain': return (y < 0.8 && y > -0.9 && Math.abs(x + 0.3) < (y + 0.95) * 0.47) || (y > -0.5 && y < 0.8 && Math.abs(x - 0.49) < (y + 0.55) * 0.49);
        case 'helmet': return (ellipse(x, y, 0, 0.16, 0.65, 0.73) && y < 0.63) || rect(x, y, -0.88, 0.45, 0.88, 0.7) || (a > 0.45 && a < 0.88 && Math.abs(y + a - 0.02) < 0.22);
        case 'mosque': case 'palace': return rect(x, y, -0.7, 0.05, 0.7, 0.79) || (ellipse(x, y, 0, 0.06, 0.59, 0.7) && y < 0.05) || (a > 0.76 && a < 0.94 && y > -0.74 && y < 0.8) || rect(x, y, -0.93, 0.7, 0.93, 0.88);
        case 'tulip': return (ellipse(x, y, 0, -0.31, 0.67, 0.51) && (y > -0.59 || a > 0.32 || a < 0.16)) || rect(x, y, -0.14, 0.05, 0.14, 0.91) || (y > 0.28 && y < 0.64 && Math.abs(a - (0.9 - y)) < 0.18);
        case 'dome': return (ellipse(x, y, 0, 0.28, 0.85, 1.1) && y < 0.35) || rect(x, y, -0.92, 0.28, 0.92, 0.63) || rect(x, y, -0.69, 0.55, 0.69, 0.85);
        case 'minaret': return (y > -0.92 && y < -0.42 && a < (y + 0.95) * 0.82) || rect(x, y, -0.28, -0.45, 0.28, 0.8) || (a < 0.5 && (band(y, -0.35, 0.13) || band(y, 0.3, 0.13))) || rect(x, y, -0.58, 0.68, 0.58, 0.9);
        case 'turban': return ellipse(x, y, 0, 0, 0.88, 0.72) || rect(x, y, -0.65, 0.52, 0.65, 0.85) || ellipse(x, y, 0, -0.65, 0.2, 0.23);
        case 'pagoda': return (band(y, -0.56, 0.19) && a < 0.55) || (band(y, 0, 0.19) && a < 0.75) || (band(y, 0.56, 0.19) && a < 0.94) || rect(x, y, -0.23, -0.9, 0.23, 0.84);
        case 'dragon': case 'serpent': return Math.abs(x - 0.5 * Math.sin((y + 0.8) * Math.PI * 1.65)) < 0.29 && Math.abs(y) < 0.89 || ellipse(x, y, -0.38, -0.58, 0.46, 0.31);
        case 'silk': case 'river': return Math.abs(x - 0.51 * Math.sin(y * Math.PI * 1.5)) < (shape === 'silk' ? 0.32 : 0.24) && Math.abs(y) < 0.91;
        case 'wall': return (Math.abs(y - Math.round(x * 2) * 0.27) < 0.23 && a < 0.92) || (Math.abs(a - 0.76) < 0.15 && Math.abs(y) < 0.74);
        case 'fan': return ellipse(x, y, 0, 0.75, 0.95, 1.6) && y < 0.56 && y > -0.86 && a < (0.95 - y) * 0.75 || rect(x, y, -0.15, 0.2, 0.15, 0.9);
        case 'calendar': return ring(x, y, 0.92, 0.92, 0.37) || (a < 0.18 && Math.abs(y) < 0.7) || (Math.abs(y) < 0.18 && a < 0.7);
        case 'jaguar': return ellipse(x, y, -0.15, 0.09, 0.68, 0.4) || ellipse(x, y, 0.5, -0.38, 0.36, 0.36) || (y > 0.1 && y < 0.83 && (Math.abs(x + 0.48) < 0.15 || Math.abs(x - 0.46) < 0.15)) || (x < -0.57 && Math.abs(y + 0.53) < 0.19);
        case 'sun': case 'rosette': return ellipse(x, y, 0, 0, 0.53, 0.53) || (a < 0.18 && Math.abs(y) < 0.94) || (Math.abs(y) < 0.18 && a < 0.94) || (Math.abs(a - Math.abs(y)) < 0.19 && a < 0.7);
        case 'lotus': return ellipse(x, y, 0, -0.23, 0.25, 0.68) || ellipse(x, y, -0.39, 0.05, 0.26, 0.57) || ellipse(x, y, 0.39, 0.05, 0.26, 0.57) || ellipse(x, y, 0, 0.51, 0.91, 0.3);
        case 'mandala': return ring(x, y, 0.92, 0.92, 0.24) || ellipse(x, y, 0, 0, 0.25, 0.25) || (a < 0.18 && Math.abs(y) < 0.78) || (Math.abs(y) < 0.18 && a < 0.78);
        case 'castle': return rect(x, y, -0.88, -0.4, 0.88, 0.82) && !(y > 0.12 && a < 0.2) || (y > -0.83 && y < -0.2 && (a > 0.62 || a < 0.18));
        case 'shield': return y > -0.83 && y < 0.94 && a < (y < 0.06 ? 0.84 : (1 - y) * 0.89);
        case 'cathedral': return rect(x, y, -0.69, -0.4, 0.69, 0.84) || (y > -0.91 && y < -0.3 && (Math.abs(a - 0.52) < 0.19)) || (a < 0.35 && y > -0.9 && y < -0.35);
        case 'flask': return rect(x, y, -0.26, -0.85, 0.26, -0.15) || ellipse(x, y, 0, 0.31, 0.81, 0.6);
        case 'portal': return ellipse(x, y, 0, 0.14, 0.88, 1.05) && !(ellipse(x, y, 0, 0.24, 0.48, 0.67) && y < 0.7) && y < 0.87;
        case 'trophy': return rect(x, y, -0.5, -0.8, 0.5, 0.05) || ellipse(x, y, 0, -0.06, 0.5, 0.4) || (ring(x, y + 0.42, 0.89, 0.47, 0.2) && y < 0) || rect(x, y, -0.14, 0.05, 0.14, 0.7) || rect(x, y, -0.52, 0.65, 0.52, 0.88);
        case 'infinity': return ring(x + 0.46, y, 0.49, 0.67, 0.26) || ring(x - 0.46, y, 0.49, 0.67, 0.26) || (Math.abs(x) < 0.26 && Math.abs(y) < 0.24);
        default: throw new Error(`Unknown silhouette: ${shape}`);
    }
}

function random(seed) {
    let s = seed >>> 0;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

export function silhouetteCells(shape, width, height) {
    const cells = [];
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        if (inSilhouette(shape, (x - (width - 1) / 2) / ((width - 3) / 2), (y - (height - 1) / 2) / ((height - 3) / 2))) cells.push([x, y]);
    }
    return cells;
}

export function carveSilhouette(cells, width, height, seed, maxLength = 5) {
    const rng = random(seed);
    const remaining = new Set(cells.map(([x, y]) => key(x, y)));
    const paths = [];
    while (remaining.size) {
        const candidates = [];
        for (const k of remaining) {
            const [x, y] = k.split(',').map(Number);
            for (const [direction, dx, dy] of DIRS) {
                let cx = x + dx, cy = y + dy, clear = true;
                while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                    if (remaining.has(key(cx, cy))) { clear = false; break; }
                    cx += dx; cy += dy;
                }
                if (clear) candidates.push({ x, y, direction, dx, dy });
            }
        }
        if (!candidates.length) throw new Error('Silhouette has no frontier');
        const head = candidates[Math.floor(rng() * candidates.length)];
        const body = [[head.x, head.y]];
        remaining.delete(key(head.x, head.y));
        const desiredLength = 2 + Math.floor(rng() * (maxLength - 1));
        while (body.length < desiredLength) {
            const [x, y] = body[body.length - 1];
            const neighbors = DIRS.map(([, dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => remaining.has(key(nx, ny)));
            if (!neighbors.length) break;
            // Prefer a straight tail; turns become deliberate, readable bends.
            let next;
            if (body.length === 1) next = neighbors.find(([nx, ny]) => nx === x - head.dx && ny === y - head.dy);
            else {
                const [px, py] = body[body.length - 2];
                next = neighbors.find(([nx, ny]) => nx === 2 * x - px && ny === 2 * y - py);
            }
            if (!next || rng() < 0.3) next = neighbors[Math.floor(rng() * neighbors.length)];
            body.push(next); remaining.delete(key(...next));
        }
        paths.push({ cells: body.reverse(), direction: head.direction });
    }
    return paths;
}

// Removing paths can only open exits. The dependency graph fully describes
// solvability; cycle detection avoids the old 32-bit/exponential BFS limit.
export function auditPuzzle(level) {
    const owner = new Map();
    const errors = [];
    const walls = new Set((level.walls || []).map(([x, y]) => key(x, y)));
    level.paths.forEach((path, i) => {
        if (!DIRS.some(([d]) => d === path.direction) || !path.cells.length) errors.push(`path ${i}: invalid direction or empty`);
        path.cells.forEach(([x, y], j) => {
            const k = key(x, y);
            if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= level.gridWidth || y >= level.gridHeight) errors.push(`path ${i}: out of bounds`);
            if (owner.has(k) || walls.has(k)) errors.push(`path ${i}: overlapping cell ${k}`);
            owner.set(k, i);
            if (j && Math.abs(x - path.cells[j - 1][0]) + Math.abs(y - path.cells[j - 1][1]) !== 1) errors.push(`path ${i}: disconnected`);
        });
    });
    const dependencies = level.paths.map((path, i) => {
        const dependencies = new Set();
        const direction = DIRS.find(([d]) => d === path.direction);
        if (!direction || !path.cells.length) return dependencies;
        const [, dx, dy] = direction;
        const [hx, hy] = path.cells[path.cells.length - 1];
        for (let x = hx + dx, y = hy + dy; x >= 0 && y >= 0 && x < level.gridWidth && y < level.gridHeight; x += dx, y += dy) {
            if (walls.has(key(x, y))) errors.push(`path ${i}: wall blocks exit`);
            const blocker = owner.get(key(x, y));
            if (blocker !== undefined && blocker !== i) dependencies.add(blocker);
        }
        return dependencies;
    });
    const done = new Set(), solution = [], depths = [];
    while (done.size < level.paths.length) {
        const ready = dependencies.map((deps, i) => !done.has(i) && [...deps].every(d => done.has(d)) ? i : -1).filter(i => i >= 0);
        if (!ready.length) { errors.push('cyclic exits'); break; }
        for (const i of ready) {
            depths[i] = 1 + Math.max(0, ...[...dependencies[i]].map(d => depths[d]));
            done.add(i); solution.push(i);
        }
    }
    const initialChoices = dependencies.filter(d => !d.size).length;
    const dependencyDepth = Math.max(0, ...depths.filter(Number.isFinite));
    const dependencyEdges = dependencies.reduce((sum, deps) => sum + deps.size, 0);
    return {
        solvable: !errors.length && done.size === level.paths.length,
        errors, solution, totalPaths: level.paths.length,
        initialChoices, dependencyDepth, dependencyEdges,
        occupiedCells: owner.size,
        blockedRatio: +(1 - initialChoices / level.paths.length).toFixed(3),
        complexity: +(level.paths.length + dependencyDepth * 4 + dependencyEdges * 0.45).toFixed(1),
    };
}
