// js/storage.js

const STORAGE_KEY = 'ok_bulmacasi_save';

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    try {
        return JSON.parse(raw);
    } catch {
        return getDefaultData();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDefaultData() {
    return {
        completedLevels: [],
        unlockedChapters: [1],
        lives: 3,
        lastLifeLostTime: null,
        freeHintsUsed: []
    };
}

export const storage = {
    getProgress() {
        return loadData();
    },

    completeLevel(levelId, chapterId) {
        const data = loadData();
        if (!data.completedLevels.includes(levelId)) {
            data.completedLevels.push(levelId);
        }
        const nextChapter = chapterId + 1;
        if (nextChapter <= 10 && !data.unlockedChapters.includes(nextChapter)) {
            const chapterLevels = data.completedLevels.filter(id => id.startsWith(this.getChapterPrefix(chapterId)));
            if (chapterLevels.length >= 5) {
                data.unlockedChapters.push(nextChapter);
            }
        }
        saveData(data);
    },

    getChapterPrefix(chapterId) {
        const prefixes = {
            1: 'egypt', 2: 'greek', 3: 'rome', 4: 'viking', 5: 'ottoman',
            6: 'china', 7: 'maya', 8: 'india', 9: 'medieval', 10: 'final'
        };
        return prefixes[chapterId] || '';
    },

    isLevelCompleted(levelId) {
        return loadData().completedLevels.includes(levelId);
    },

    isChapterUnlocked(chapterId) {
        return loadData().unlockedChapters.includes(chapterId);
    },

    getLives() {
        const data = loadData();
        if (data.lives < 3 && data.lastLifeLostTime) {
            const elapsed = Date.now() - data.lastLifeLostTime;
            const regenInterval = 20 * 60 * 1000;
            const livesRegened = Math.floor(elapsed / regenInterval);
            if (livesRegened > 0) {
                data.lives = Math.min(3, data.lives + livesRegened);
                data.lastLifeLostTime = livesRegened >= (3 - data.lives)
                    ? null
                    : data.lastLifeLostTime + livesRegened * regenInterval;
                saveData(data);
            }
        }
        return data.lives;
    },

    loseLife() {
        const data = loadData();
        data.lives = Math.max(0, data.lives - 1);
        if (!data.lastLifeLostTime) {
            data.lastLifeLostTime = Date.now();
        }
        saveData(data);
        return data.lives;
    },

    addLife() {
        const data = loadData();
        data.lives = Math.min(3, data.lives + 1);
        if (data.lives >= 3) {
            data.lastLifeLostTime = null;
        }
        saveData(data);
        return data.lives;
    },

    getTimeUntilNextLife() {
        const data = loadData();
        if (data.lives >= 3 || !data.lastLifeLostTime) return 0;
        const elapsed = Date.now() - data.lastLifeLostTime;
        const regenInterval = 20 * 60 * 1000;
        const timeInCurrentCycle = elapsed % regenInterval;
        return regenInterval - timeInCurrentCycle;
    },

    isFreeHintUsed(levelId) {
        return loadData().freeHintsUsed.includes(levelId);
    },

    useFreeHint(levelId) {
        const data = loadData();
        if (!data.freeHintsUsed.includes(levelId)) {
            data.freeHintsUsed.push(levelId);
        }
        saveData(data);
    },

    resetAll() {
        localStorage.removeItem(STORAGE_KEY);
    }
};
