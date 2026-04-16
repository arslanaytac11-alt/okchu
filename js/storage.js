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
        unlockedChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        lives: 3,
        lastLifeLostTime: null,
        freeHintsUsed: [],
        levelScores: {},   // { levelId: { score, stars, moves, time, bestCombo } }
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
        // Star-based unlock: need 10+ stars in current chapter to unlock next
        const nextChapter = chapterId + 1;
        if (nextChapter <= 10 && !data.unlockedChapters.includes(nextChapter)) {
            const chapterStars = this.getChapterStars(chapterId);
            if (chapterStars >= 10) {
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

    saveLevelScore(levelId, scoreData) {
        const data = loadData();
        if (!data.levelScores) data.levelScores = {};
        const existing = data.levelScores[levelId];
        // Keep best score
        if (!existing || scoreData.score > existing.score) {
            data.levelScores[levelId] = scoreData;
        }
        saveData(data);
    },

    getLevelScore(levelId) {
        const data = loadData();
        return data.levelScores?.[levelId] || null;
    },

    getChapterStars(chapterId) {
        const data = loadData();
        const prefix = this.getChapterPrefix(chapterId);
        let total = 0;
        for (const [id, score] of Object.entries(data.levelScores || {})) {
            if (id.startsWith(prefix) && score.stars) {
                total += score.stars;
            }
        }
        return total;
    },

    getTotalStars() {
        const data = loadData();
        let total = 0;
        for (const score of Object.values(data.levelScores || {})) {
            if (score.stars) total += score.stars;
        }
        return total;
    },

    resetAll() {
        localStorage.removeItem(STORAGE_KEY);
    }
};
