// js/hints.js

import { storage } from './storage.js';

export class HintManager {
    constructor() {
        this.currentLevelId = null;
    }

    setLevel(levelId) {
        this.currentLevelId = levelId;
    }

    hasFreeHint() {
        if (!this.currentLevelId) return false;
        return !storage.isFreeHintUsed(this.currentLevelId);
    }

    useFreeHint() {
        if (!this.currentLevelId) return;
        storage.useFreeHint(this.currentLevelId);
    }

    findHintArrow(grid) {
        const removable = grid.getRemovablePaths();
        if (removable.length === 0) return null;
        return removable[Math.floor(Math.random() * removable.length)];
    }
}
