import assert from 'node:assert/strict';

const SAVE_KEY = 'ok_bulmacasi_save';
const memory = new Map();
globalThis.localStorage = {
    getItem: key => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key),
};
const { storage } = await import('../js/storage.js');
const passed = [];
function check(name, test) { memory.clear(); test(); passed.push(name); }

function progressed(premium) {
    storage.setPremium(premium);
    for (let i = 1; i <= 4; i++) {
        storage.saveLevelScore('egypt_' + i, { score: 200, stars: 3, moves: 5, time: 40 });
        storage.completeLevel('egypt_' + i, 1);
    }
    storage.setGameMode('zen');
    storage.setLastPlayed(2, 'greek_3');
    storage.loseLife();
    storage.loseLife();
    storage.useFreeHint('egypt_1');
    storage.earnPowerup('hint', 3);
    storage.earnPowerup('freeze', 2);
    storage.earnPowerup('extraUndo', 1);
    storage.collectArtifact(1);
    storage.recordDailyScore(400, 3);
    // Old campaign-only fields must not survive a progress reset either.
    memory.set(SAVE_KEY, JSON.stringify({ ...storage.getProgress(), legacyCampaignFlag: 'old' }));
    assert.equal(storage.getProgress().completedLevels.length, 4);
    assert.equal(storage.getTotalStars(), 12);
    assert.equal(storage.isChapterUnlocked(2), true);
    assert.equal(storage.getLives(), 1);
    assert.equal(storage.isFreeHintUsed('egypt_1'), true);
    assert.equal(storage.getCollectedArtifacts().length, 1);
    assert.equal(storage.getProgress().dailyScores.length, 1);
}

function assertReset(premium) {
    assert.deepEqual(storage.getProgress(), {
        completedLevels: [],
        unlockedChapters: [1],
        lives: 3,
        lastLifeLostTime: null,
        freeHintsUsed: [],
        levelScores: {},
        powerups: { hint: 0, freeze: 0, extraUndo: 0 },
        collectedArtifacts: [],
        dailyScores: [],
        gameMode: 'classic',
        premium,
    });
    assert.equal(storage.isPremium(), premium);
    assert.equal(storage.getLastPlayed(), null);
    assert.equal(storage.getLives(), 3);
    assert.equal(storage.getTotalStars(), 0);
    assert.equal(storage.isChapterUnlocked(2), false);
    assert.equal(storage.isBossLocked(1, 5), true);
    assert.equal(storage.isFreeHintUsed('egypt_1'), false);
    assert.equal(storage.hasArtifact(1), false);
    assert.deepEqual(storage.getWeeklyLeaderboard(), []);
}

check('paid Premium survives while campaign, lives, resume, mode, hints, powerups, artifacts and daily scores reset', () => {
    progressed(true);
    storage.resetAll();
    assertReset(true);
    // Reload through the real storage layer, rather than an in-memory flag.
    assert.equal(JSON.parse(memory.get(SAVE_KEY)).premium, true);
    storage.resetAll();
    assertReset(true);
});

check('a non-Premium player resets to defaults without acquiring Premium', () => {
    progressed(false);
    storage.resetAll();
    assertReset(false);
    storage.resetAll();
    assertReset(false);
});

check('a valid paid flag survives malformed campaign fields and clears their unsafe values', () => {
    memory.set(SAVE_KEY, JSON.stringify({
        premium: true, completedLevels: null, unlockedChapters: 'broken', lives: -10,
        levelScores: null, powerups: 'broken', freeHintsUsed: false,
        collectedArtifacts: null, dailyScores: 'broken', gameMode: 'invalid',
        lastPlayed: { chapterId: 99, levelId: 'not-a-level' },
    }));
    assert.doesNotThrow(() => storage.resetAll());
    assertReset(true);
});

check('invalid JSON, non-object payloads, and missing saves safely become fresh non-Premium data', () => {
    for (const raw of ['{invalid', 'null', '42', '[]', '"broken"', null]) {
        memory.clear();
        if (raw !== null) memory.set(SAVE_KEY, raw);
        assert.doesNotThrow(() => storage.resetAll(), String(raw));
        assertReset(false);
    }
});

console.log(JSON.stringify({ checks: passed.length, malformedPayloads: 6, passed }));
