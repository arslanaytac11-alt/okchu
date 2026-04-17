// js/level-validator.js
// Validates that a level is solvable by simulating all possible removal orders
// Uses BFS to find at least one valid solution

export function validateLevel(levelData) {
    const { gridWidth, gridHeight, paths } = levelData;

    // BFS: state = set of removed path indices
    // Start: no paths removed
    // Goal: all paths removed
    const totalPaths = paths.length;

    // State: bitmask of removed paths
    const visited = new Set();
    const queue = [{ removed: 0, steps: [] }];
    visited.add(0);

    while (queue.length > 0) {
        const { removed, steps } = queue.shift();

        // Check if all removed
        if (countBits(removed) === totalPaths) {
            return { solvable: true, solution: steps, totalPaths };
        }

        // Find which paths are removable in current state
        for (let i = 0; i < totalPaths; i++) {
            if (removed & (1 << i)) continue; // already removed

            if (isPathClearInState(paths, i, removed, gridWidth, gridHeight)) {
                const newRemoved = removed | (1 << i);
                if (!visited.has(newRemoved)) {
                    visited.add(newRemoved);
                    queue.push({ removed: newRemoved, steps: [...steps, i] });
                }
            }
        }
    }

    return { solvable: false, totalPaths };
}

function isPathClearInState(paths, pathIdx, removedMask, gridW, gridH) {
    const path = paths[pathIdx];
    const head = path.cells[path.cells.length - 1]; // last cell = head
    const { dx, dy } = getDirVec(path.direction);

    let cx = head[0] + dx;
    let cy = head[1] + dy;

    while (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
        // Check if any non-removed path occupies this cell
        for (let i = 0; i < paths.length; i++) {
            if (i === pathIdx) continue;
            if (removedMask & (1 << i)) continue; // removed
            if (pathHasCell(paths[i], cx, cy)) return false;
        }
        cx += dx;
        cy += dy;
    }
    return true;
}

function pathHasCell(path, x, y) {
    return path.cells.some(c => c[0] === x && c[1] === y);
}

function getDirVec(dir) {
    switch (dir) {
        case 'up': return { dx: 0, dy: -1 };
        case 'down': return { dx: 0, dy: 1 };
        case 'left': return { dx: -1, dy: 0 };
        case 'right': return { dx: 1, dy: 0 };
    }
}

function countBits(n) {
    let count = 0;
    while (n) { count += n & 1; n >>= 1; }
    return count;
}

// Run validation on all levels
export function validateAllLevels(allLevels) {
    const results = [];
    for (const level of allLevels) {
        // BFS is exponential - skip if > 25 paths (too many states)
        if (level.paths.length > 25) {
            results.push({ id: level.id, skipped: true, reason: 'too many paths for BFS' });
            continue;
        }
        const result = validateLevel(level);
        results.push({ id: level.id, ...result });
    }
    return results;
}
