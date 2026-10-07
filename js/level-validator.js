// Removing an arrow can only open exits, so an acyclic blocker graph is both
// necessary and sufficient for a solution. Audit all sizes without bit masks,
// exponential search, or skipping the hardest boards.
import { auditPuzzle } from './puzzle-catalog.js';

export function validateLevel(levelData) {
    return auditPuzzle(levelData);
}

export function validateAllLevels(allLevels) {
    return allLevels.map(level => ({ id: level.id, ...validateLevel(level) }));
}
