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
