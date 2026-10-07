// Geometry remains a DAG audit. Coded boards additionally require a proven
// solution in the exact state solver; a search limit is never a proof of failure.
import { auditPuzzle } from './puzzle-catalog.js';
import { createRuneSolver } from './rune-order.js';

export function validateLevel(levelData) {
    const geometry = auditPuzzle(levelData);
    if (levelData.boardCells !== undefined) {
        const cells = levelData.boardCells, expected = new Set(levelData.paths.flatMap(path=>path.cells).map(cell=>cell.join(',')));
        const valid = Array.isArray(cells) && cells.every(cell=>Array.isArray(cell) && cell.length===2 &&
            cell.every(Number.isInteger) && cell[0]>=0 && cell[0]<levelData.gridWidth && cell[1]>=0 && cell[1]<levelData.gridHeight);
        const actual = valid ? new Set(cells.map(cell=>cell.join(','))) : new Set();
        if (!valid || actual.size !== cells.length || actual.size !== expected.size || [...actual].some(cell=>!expected.has(cell))) {
            return {...geometry, solvable:false, errors:['Authored board footprint must match every initial arrow cell exactly']};
        }
    }
    if (!geometry.solvable || !levelData.runeCycle) return geometry;
    try {
        const rune = createRuneSolver(levelData).audit();
        return { ...geometry, solvable: rune.status === 'solvable',
            errors: rune.status === 'solvable' ? [] : [rune.status === 'unknown' ? 'Rune search budget exceeded' : 'Rune order has no solution'],
            solution: rune.solution, rune };
    } catch (error) {
        return { ...geometry, solvable: false, errors: [error.message] };
    }
}

export function validateAllLevels(allLevels) {
    return allLevels.map(level => ({ id: level.id, ...validateLevel(level) }));
}
