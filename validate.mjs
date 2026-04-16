// Quick level validator - greedy approach
import { egyptLevels } from './js/data/levels/egypt.js';
import { greekLevels } from './js/data/levels/greek.js';
import { romeLevels } from './js/data/levels/rome.js';
import { vikingLevels } from './js/data/levels/viking.js';
import { ottomanLevels } from './js/data/levels/ottoman.js';
import { chinaLevels } from './js/data/levels/china.js';
import { mayaLevels } from './js/data/levels/maya.js';
import { indiaLevels } from './js/data/levels/india.js';
import { medievalLevels } from './js/data/levels/medieval.js';
import { finalLevels } from './js/data/levels/final.js';

function getDirVec(dir) {
    switch (dir) {
        case 'up': return { dx: 0, dy: -1 };
        case 'down': return { dx: 0, dy: 1 };
        case 'left': return { dx: -1, dy: 0 };
        case 'right': return { dx: 1, dy: 0 };
    }
}

function pathHasCell(path, x, y) {
    return path.cells.some(c => c[0] === x && c[1] === y);
}

function isPathClear(paths, pathIdx, removedSet, gridW, gridH) {
    const path = paths[pathIdx];
    const head = path.cells[path.cells.length - 1];
    const { dx, dy } = getDirVec(path.direction);
    let cx = head[0] + dx;
    let cy = head[1] + dy;
    while (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
        for (let i = 0; i < paths.length; i++) {
            if (i === pathIdx || removedSet.has(i)) continue;
            if (pathHasCell(paths[i], cx, cy)) return false;
        }
        cx += dx;
        cy += dy;
    }
    return true;
}

function solveGreedy(levelData) {
    const { gridWidth, gridHeight, paths } = levelData;
    const n = paths.length;
    const removed = new Set();
    const steps = [];

    while (removed.size < n) {
        let foundAny = false;
        for (let i = 0; i < n; i++) {
            if (removed.has(i)) continue;
            if (isPathClear(paths, i, removed, gridWidth, gridHeight)) {
                removed.add(i);
                steps.push(i);
                foundAny = true;
                break;
            }
        }
        if (!foundAny) {
            return { solved: false, stuckAt: removed.size, total: n };
        }
    }
    return { solved: true, steps, total: n };
}

const allLevels = [
    ...egyptLevels, ...greekLevels, ...romeLevels,
    ...vikingLevels, ...ottomanLevels, ...chinaLevels,
    ...mayaLevels, ...indiaLevels, ...medievalLevels, ...finalLevels
];

let ok = 0, fail = 0;
for (const level of allLevels) {
    const result = solveGreedy(level);
    if (result.solved) {
        console.log(`${level.id} (lv${level.level}): OK - ${result.total} paths`);
        ok++;
    } else {
        console.log(`${level.id} (lv${level.level}): FAIL at ${result.stuckAt}/${result.total}`);
        fail++;
    }
}
console.log(`\nTotal: ${ok} OK, ${fail} FAIL, ${allLevels.length} levels`);
