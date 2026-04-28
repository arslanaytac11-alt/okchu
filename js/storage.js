// js/storage.js

const STORAGE_KEY = 'ok_bulmacasi_save';

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    try {
        const parsed = JSON.parse(raw);
        return { ...getDefaultData(), ...parsed };
    } catch {
        return getDefaultData();
    }
}

function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        // storage quota or privacy mode — fail silently, game keeps working in-memory
    }
}

function getDefaultData() {
    return {
        completedLevels: [],
        unlockedChapters: [1],
        lives: 3,
        lastLifeLostTime: null,
        freeHintsUsed: [],
        levelScores: {},   // { levelId: { score, stars, moves, time, bestCombo } }
        powerups: { hint: 0, freeze: 0, extraUndo: 0 },
        collectedArtifacts: [],
        dailyScores: [],   // [{ date, score, stars }] - weekly leaderboard
        gameMode: 'classic', // 'classic' | 'timed' | 'moves' | 'zen'
        premium: false,      // Non-consumable IAP: com.arslanaytac.okchu.premium
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

    // Track which chapter + level the player last started so the Play button
    // can resume them straight back into the right chapter list instead of
    // making them navigate Chapters → Egypt → Levels every session. Called
    // by game.startLevel; read by main.js's Play handler.
    setLastPlayed(chapterId, levelId) {
        const data = loadData();
        data.lastPlayed = { chapterId, levelId };
        saveData(data);
    },

    getLastPlayed() {
        return loadData().lastPlayed || null;
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

    // Boss level = level 5 of each chapter. Locked until the first 4 levels in
    // the chapter sum to at least 8 stars (out of possible 12 = 2-star average).
    isBossLocked(chapterId, levelNumInChapter) {
        if (levelNumInChapter !== 5) return false;
        const prefix = this.getChapterPrefix(chapterId);
        const data = loadData();
        let stars = 0;
        for (let i = 1; i <= 4; i++) {
            const s = data.levelScores?.[`${prefix}_${i}`];
            if (s?.stars) stars += s.stars;
        }
        return stars < 8;
    },

    getBossGateProgress(chapterId) {
        const prefix = this.getChapterPrefix(chapterId);
        const data = loadData();
        let stars = 0;
        for (let i = 1; i <= 4; i++) {
            const s = data.levelScores?.[`${prefix}_${i}`];
            if (s?.stars) stars += s.stars;
        }
        return { current: stars, required: 8 };
    },

    getLives() {
        const data = loadData();
        if (data.lives < 3 && data.lastLifeLostTime) {
            const regenInterval = 20 * 60 * 1000;
            const elapsed = Date.now() - data.lastLifeLostTime;
            const cyclesPassed = Math.floor(elapsed / regenInterval);
            if (cyclesPassed > 0) {
                const needed = 3 - data.lives;
                const actualRegen = Math.min(cyclesPassed, needed);
                data.lives += actualRegen;
                if (data.lives >= 3) {
                    data.lastLifeLostTime = null;
                } else {
                    // Advance anchor by exactly actualRegen cycles — remainder elapsed time is preserved
                    data.lastLifeLostTime += actualRegen * regenInterval;
                }
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
    },

    // === Power-ups ===
    getPowerups() {
        const data = loadData();
        return { ...{ hint: 0, freeze: 0, extraUndo: 0 }, ...(data.powerups || {}) };
    },

    earnPowerup(type, amount = 1) {
        const data = loadData();
        if (!data.powerups) data.powerups = { hint: 0, freeze: 0, extraUndo: 0 };
        data.powerups[type] = (data.powerups[type] || 0) + amount;
        saveData(data);
        return data.powerups[type];
    },

    usePowerup(type) {
        const data = loadData();
        if (!data.powerups) data.powerups = { hint: 0, freeze: 0, extraUndo: 0 };
        if ((data.powerups[type] || 0) <= 0) return false;
        data.powerups[type]--;
        saveData(data);
        return true;
    },

    // === Artifacts collection ===
    collectArtifact(chapterId) {
        const data = loadData();
        if (!data.collectedArtifacts) data.collectedArtifacts = [];
        if (!data.collectedArtifacts.includes(chapterId)) {
            data.collectedArtifacts.push(chapterId);
            saveData(data);
            return true;
        }
        return false;
    },

    hasArtifact(chapterId) {
        return (loadData().collectedArtifacts || []).includes(chapterId);
    },

    getCollectedArtifacts() {
        return loadData().collectedArtifacts || [];
    },

    // === Weekly leaderboard (local, daily challenge scores) ===
    recordDailyScore(score, stars) {
        const data = loadData();
        if (!data.dailyScores) data.dailyScores = [];
        const today = new Date().toISOString().slice(0, 10);
        const existing = data.dailyScores.find(d => d.date === today);
        if (existing) {
            if (score > existing.score) { existing.score = score; existing.stars = stars; }
        } else {
            data.dailyScores.push({ date: today, score, stars });
        }
        // Prune scores older than 30 days
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        data.dailyScores = data.dailyScores.filter(d => new Date(d.date).getTime() >= cutoff);
        saveData(data);
    },

    getWeeklyLeaderboard() {
        const data = loadData();
        const scores = (data.dailyScores || []).slice();
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return scores
            .filter(d => new Date(d.date).getTime() >= cutoff)
            .sort((a, b) => b.score - a.score);
    },

    // === Game mode ===
    getGameMode() {
        return loadData().gameMode || 'classic';
    },

    setGameMode(mode) {
        const data = loadData();
        data.gameMode = mode;
        saveData(data);
    },

    // === Premium (IAP) ===
    isPremium() {
        return !!loadData().premium;
    },

    setPremium(value) {
        const data = loadData();
        data.premium = !!value;
        saveData(data);
    },
};
