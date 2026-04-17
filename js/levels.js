// js/levels.js

import { egyptLevels } from './data/levels/egypt.js';
import { greekLevels } from './data/levels/greek.js';
import { romeLevels } from './data/levels/rome.js';
import { vikingLevels } from './data/levels/viking.js';
import { ottomanLevels } from './data/levels/ottoman.js';
import { chinaLevels } from './data/levels/china.js';
import { mayaLevels } from './data/levels/maya.js';
import { indiaLevels } from './data/levels/india.js';
import { medievalLevels } from './data/levels/medieval.js';
import { finalLevels } from './data/levels/final.js';

export const allLevels = [
    ...egyptLevels,
    ...greekLevels,
    ...romeLevels,
    ...vikingLevels,
    ...ottomanLevels,
    ...chinaLevels,
    ...mayaLevels,
    ...indiaLevels,
    ...medievalLevels,
    ...finalLevels
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
