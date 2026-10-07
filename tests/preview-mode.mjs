import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLocalReviewMode } from '../js/preview-mode.js';

const SAVE_KEY = 'ok_bulmacasi_save';
const REVIEW_URL = 'http://127.0.0.1:5188/?kontrol=1';
const storageURL = new URL('../js/storage.js', import.meta.url).href;
const checks = [];
let guardCases = 0, moduleId = 0, now = Date.now(), nextTimer = 1;
const rafs = [], intervals = new Map();
globalThis.performance = { now: () => now };
Date.now = () => now;
globalThis.requestAnimationFrame = fn => { rafs.push(fn); return nextTimer++; };
globalThis.cancelAnimationFrame = () => {};
globalThis.setInterval = fn => { const id = nextTimer++; intervals.set(id, fn); return id; };
globalThis.clearInterval = id => intervals.delete(id);
globalThis.setTimeout = () => nextTimer++;
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

function element(tag = 'div') {
    const classes = new Set(), attributes = new Map();
    return {
        tagName: tag.toUpperCase(), dataset: {}, textContent: '', hidden: false,
        style: { setProperty() {}, removeProperty() {} }, children: [], listeners: {},
        classList: {
            add(...items) { items.forEach(item => classes.add(item)); },
            remove(...items) { items.forEach(item => classes.delete(item)); },
            toggle(item, value) { if (value) classes.add(item); else classes.delete(item); },
            contains: item => classes.has(item),
        },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute: name => attributes.get(name) ?? null,
        addEventListener(name, callback) { this.listeners[name] = callback; },
        appendChild(child) { this.children.push(child); },
        append(...children) { this.children.push(...children); },
        getContext: () => new Proxy({}, { get: () => () => {} }),
        set innerHTML(_) { this.children = []; },
        get innerHTML() { return ''; },
    };
}
let elements = new Map();
function el(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }
function installDocument() {
    elements = new Map();
    globalThis.document = {
        hidden: false, getElementById: el, documentElement: element(), body: { dataset: {} },
        querySelector: selector => el(selector), querySelectorAll: () => [],
        createElement: element, createElementNS: (_, tag) => element(tag),
        createTextNode: text => ({ textContent: text }),
    };
}
function seed(premium = true) {
    return {
        completedLevels: ['egypt_2'], unlockedChapters: [1], lives: 2,
        lastLifeLostTime: now, freeHintsUsed: ['egypt_2'],
        levelScores: { egypt_2: { score: 180, stars: 2, moves: 8, time: 30000 } },
        powerups: { hint: 2, freeze: 1, extraUndo: 1 }, collectedArtifacts: [],
        dailyScores: [], gameMode: 'timed', premium,
        lastPlayed: { chapterId: 1, levelId: 'egypt_2' },
    };
}
async function fixture({ href = REVIEW_URL, data = seed(), raw, windowFields = {} } = {}) {
    globalThis.location = { href };
    globalThis.window = { location: globalThis.location, devicePixelRatio: 1, ...windowFields };
    const disk = new Map();
    if (raw !== undefined) { if (raw !== null) disk.set(SAVE_KEY, raw); }
    else disk.set(SAVE_KEY, JSON.stringify(data));
    const baseline = new Map(disk), writes = [];
    globalThis.localStorage = {
        getItem: key => disk.has(key) ? disk.get(key) : null,
        setItem(key, value) { writes.push(['set', key]); disk.set(key, String(value)); },
        removeItem(key) { writes.push(['remove', key]); disk.delete(key); },
    };
    installDocument(); rafs.length = 0; intervals.clear();
    const moduleURL = storageURL + '?preview-test=' + (++moduleId);
    const { storage } = await import(moduleURL);
    return { storage, moduleURL, disk, baseline, writes };
}
function unchanged(fixture) {
    assert.deepEqual(fixture.disk, fixture.baseline, 'The real disk state must remain byte-identical');
    assert.deepEqual(fixture.writes, [], 'Review actions must not even attempt a real persistent write');
}
async function check(name, callback) { await callback(); checks.push(name); }
function isolatedModule(file, overrides = {}) {
    const fileURL = new URL('../js/' + file, import.meta.url);
    const source = readFileSync(fileURL, 'utf8').replace(/from\s+(['"])(\.\/[^'"]+)\1/g,
        (_, quote, relative) => 'from ' + quote + (overrides[relative] || new URL(relative, fileURL).href) + quote);
    return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
}

await check('strict loopback/protocol/flag matrix and native bridge rejection, including nested window and unrelated WebKit handlers', () => {
    const allowed = [
        'http://localhost/?kontrol=1', 'https://localhost:9000/puzzles?kontrol=1',
        'http://127.0.0.1:5188/?kontrol=1', 'https://127.0.0.1/?other=x&kontrol=1',
        'http://[::1]:5188/?kontrol=1', 'https://[::1]/?kontrol=1#chapter-10',
    ];
    const denied = [
        'http://localhost/', 'http://localhost/?kontrol=0', 'http://localhost/?kontrol=true',
        'http://localhost/?Kontrol=1', 'http://localhost/?kontrol=',
        'http://localhost/?kontrol=1&kontrol=1', 'http://localhost/?kontrol=1&kontrol=0',
        'https://okchu.example/?kontrol=1', 'https://localhost.example/?kontrol=1',
        'http://127.0.0.1.example/?kontrol=1', 'http://192.168.1.10/?kontrol=1',
        'http://0.0.0.0/?kontrol=1', 'file:///localhost/index.html?kontrol=1',
        'capacitor://localhost/?kontrol=1', 'ionic://localhost/?kontrol=1',
        'ftp://localhost/?kontrol=1', 'about:blank?kontrol=1', 'not a URL',
    ];
    for (const href of allowed) { assert.equal(isLocalReviewMode({ location: { href } }), true, href); guardCases++; }
    for (const href of denied) { assert.equal(isLocalReviewMode({ location: { href } }), false, href); guardCases++; }
    for (const environment of [{}, { location: {} }, { location: null }, { location: { href: '' } },
        { get location() { throw new Error('unreadable location'); } }]) {
        assert.equal(isLocalReviewMode(environment), false); guardCases++;
    }
    assert.equal(isLocalReviewMode({ window: { location: { href: REVIEW_URL } } }), true); guardCases++;
    const bridges = [
        { Capacitor: {} }, { Capacitor: { isNativePlatform: () => false } },
        { cordova: {} }, { ReactNativeWebView: {} }, { androidBridge: {} },
        { webkit: { messageHandlers: { bridge: {} } } },
        { webkit: { messageHandlers: { cordova: {} } } },
        { webkit: { messageHandlers: { capacitor: {} } } },
    ];
    for (const bridge of bridges) for (const nested of [false, true]) {
        const environment = nested
            ? { location: { href: REVIEW_URL }, window: { ...bridge } }
            : { location: { href: REVIEW_URL }, ...bridge };
        assert.equal(isLocalReviewMode(environment), false, JSON.stringify({ bridge, nested })); guardCases++;
    }
    for (const nested of [false, true]) {
        const unrelated = { webkit: { messageHandlers: { codexBrowser: {}, screenReader: {} } } };
        assert.equal(isLocalReviewMode(nested ? { location: { href: REVIEW_URL }, window: unrelated }
            : { location: { href: REVIEW_URL }, ...unrelated }), true); guardCases++;
    }
});

await check('all ten review chapter and boss gates open without fabricating saved stars, completion or Premium', async () => {
    const h = await fixture();
    assert.deepEqual(h.storage.getProgress(), seed());
    for (let chapter = 1; chapter <= 10; chapter++) {
        assert.equal(h.storage.isChapterUnlocked(chapter), true);
        assert.equal(h.storage.isBossLocked(chapter, 5), false);
    }
    for (const invalid of [0, 11, -1, '2', 1.5]) assert.equal(h.storage.isChapterUnlocked(invalid), false);
    assert.deepEqual(h.storage.getProgress().completedLevels, ['egypt_2']);
    assert.deepEqual(h.storage.getProgress().unlockedChapters, [1]);
    assert.equal(h.storage.getTotalStars(), 2);
    assert.equal(h.storage.isPremium(), true);
    assert.equal(h.storage.getGameMode(), 'zen');
    const copy = h.storage.getProgress(); copy.completedLevels.push('final_5'); copy.levelScores.egypt_2.stars = 99;
    assert.equal(h.storage.isLevelCompleted('final_5'), false); assert.equal(h.storage.getTotalStars(), 2);
    unchanged(h);
});

await check('score, completion, resume, hints, lives, powerups, artifacts, daily scores and chosen modes mutate only the review snapshot', async () => {
    const h = await fixture(); const s = h.storage;
    s.saveLevelScore('final_5', { score: 900, stars: 3, moves: 20, time: 120000 });
    s.completeLevel('final_5', 10); s.setLastPlayed(10, 'final_5');
    s.useFreeHint('final_5'); s.loseLife(); assert.equal(s.getLives(), 1); s.addLife();
    s.earnPowerup('hint', 3); assert.equal(s.usePowerup('freeze'), true); s.collectArtifact(10);
    s.recordDailyScore(456, 2); s.setGameMode('classic'); assert.equal(s.getGameMode(), 'classic');
    s.setGameMode('timed'); assert.equal(s.getGameMode(), 'timed');
    assert.equal(s.isLevelCompleted('final_5'), true); assert.equal(s.getTotalStars(), 5);
    assert.equal(s.getLevelScore('final_5').score, 900); assert.equal(s.isFreeHintUsed('final_5'), true);
    assert.deepEqual(s.getLastPlayed(), { chapterId: 10, levelId: 'final_5' });
    assert.deepEqual(s.getPowerups(), { hint: 5, freeze: 0, extraUndo: 1 });
    assert.equal(s.hasArtifact(10), true); assert.equal(s.getWeeklyLeaderboard()[0].score, 456);
    assert.equal(s.isPremium(), true); unchanged(h);
    const refreshed = (await import(storageURL + '?preview-refresh=' + (++moduleId))).storage;
    assert.deepEqual(refreshed.getProgress(), seed()); assert.equal(refreshed.getGameMode(), 'zen');
    assert.equal(refreshed.isLevelCompleted('final_5'), false); unchanged(h);
});

await check('life regeneration, Premium simulation and reset are isolated for both paid and free real saves', async () => {
    for (const premium of [true, false]) {
        const data = seed(premium); data.lastLifeLostTime = now - 40 * 60 * 1000;
        const h = await fixture({ data }); const s = h.storage;
        assert.equal(s.getLives(), 3, 'The life regeneration getter writes only to ephemeral state');
        s.setPremium(!premium); assert.equal(s.isPremium(), !premium);
        s.setGameMode('timed'); s.resetAll();
        assert.equal(s.getTotalStars(), 0); assert.deepEqual(s.getProgress().completedLevels, []);
        assert.equal(s.getLastPlayed(), null); assert.equal(s.getGameMode(), 'zen');
        assert.equal(s.isPremium(), !premium); assert.equal(s.isChapterUnlocked(10), true);
        assert.equal(JSON.parse(h.disk.get(SAVE_KEY)).premium, premium); unchanged(h);
    }
});

await check('a real legal Egypt1 solve defaults to untimed Zen, records a genuine local score and never writes campaign or onboarding data', async () => {
    const h = await fixture();
    const livesURL = isolatedModule('lives.js', { './storage.js': h.moduleURL });
    const hintsURL = isolatedModule('hints.js', { './storage.js': h.moduleURL });
    const gameURL = isolatedModule('game.js', { './storage.js': h.moduleURL, './lives.js': livesURL, './hints.js': hintsURL });
    const { Game } = await import(gameURL);
    const { allLevels } = await import('../js/levels.js');
    const { chapters } = await import('../js/data/chapters.js');
    const canvas = { clientWidth: 390, clientHeight: 600, getContext: () => new Proxy({}, { get: () => () => {} }),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 600 }), addEventListener() {} };
    const game = new Game(canvas);
    game.startRenderLoop = () => {}; game.stopRenderLoop = () => {}; game._showFloatingScore = () => {};
    game.playCelebration = callback => callback();
    for (const method of ['setTheme', 'drawGrid', 'drawHintHighlight', 'showCrackEffect']) game.renderer[method] = () => {};
    const level = allLevels.find(candidate => candidate.id === 'egypt_1');
    game.startLevel(level, chapters[0]);
    assert.equal(game.gameMode, 'zen'); assert.equal(game.zenMode, true); assert.equal(game._timerInterval, null);
    assert.equal(game.onboardingActive, false, 'Review cannot persist the real onboarding completion flag');
    while (!game.grid.isCleared()) {
        const path = game.grid.getActivePaths().find(candidate => game.grid.isPathClear(candidate));
        assert.ok(path, 'Use the actual puzzle dependency rule to find each legal move');
        game.removePathWithAnimation(path); now += 400;
        const callbacks = rafs.splice(0); callbacks.forEach(callback => callback(now));
    }
    assert.equal(game._outcome, 'complete'); assert.equal(game.moves, level.paths.length);
    assert.equal(h.storage.isLevelCompleted('egypt_1'), true);
    assert.equal(h.storage.getLevelScore('egypt_1').stars, 3); assert.ok(h.storage.getLevelScore('egypt_1').score > 0);
    assert.equal(h.storage.getTotalStars(), 5); assert.equal(h.storage.getProgress().completedLevels.length, 2);
    unchanged(h); game.leaveLevel();
});

await check('without the flag, production storage retains 8-star boss / 10-star chapter gates, saved mode and usual persistence', async () => {
    const h = await fixture({ href: 'http://127.0.0.1:5188/', data: seed(true) }); const s = h.storage;
    assert.equal(s.getGameMode(), 'timed');
    for (let chapter = 1; chapter <= 10; chapter++) {
        assert.equal(s.isChapterUnlocked(chapter), chapter === 1); assert.equal(s.isBossLocked(chapter, 5), true);
    }
    s.saveLevelScore('egypt_1', { score: 100, stars: 3 }); s.saveLevelScore('egypt_3', { score: 100, stars: 2 });
    assert.equal(s.getBossGateProgress(1).current, 7); assert.equal(s.isBossLocked(1, 5), true);
    s.saveLevelScore('egypt_4', { score: 100, stars: 1 });
    assert.equal(s.isBossLocked(1, 5), false); assert.equal(s.isChapterUnlocked(2), false);
    s.saveLevelScore('egypt_4', { score: 100, stars: 3 }); s.completeLevel('egypt_4', 1);
    assert.equal(s.getChapterStars(1), 10); assert.equal(s.isChapterUnlocked(2), true);
    s.setGameMode('classic'); s.loseLife(); s.useFreeHint('egypt_4'); s.earnPowerup('hint', 2); s.setLastPlayed(2, 'greek_1');
    assert.ok(h.writes.length > 0); const stored = JSON.parse(h.disk.get(SAVE_KEY));
    assert.equal(stored.gameMode, 'classic'); assert.equal(stored.lives, 1); assert.equal(stored.premium, true);
    assert.equal(stored.freeHintsUsed.includes('egypt_4'), true); assert.equal(stored.powerups.hint, 4);
    const reloaded = (await import(storageURL + '?normal-refresh=' + (++moduleId))).storage;
    assert.equal(reloaded.getGameMode(), 'classic'); assert.equal(reloaded.isChapterUnlocked(2), true);
    assert.equal(reloaded.isBossLocked(2, 5), true); assert.equal(reloaded.isPremium(), true);
});

await check('native localhost and production-origin flagged URLs cannot open storage gates or override the saved mode', async () => {
    for (const settings of [
        { href: 'https://okchu.example/?kontrol=1' },
        { href: 'capacitor://localhost/?kontrol=1' },
        { windowFields: { Capacitor: { isNativePlatform: () => true } } },
        { windowFields: { webkit: { messageHandlers: { bridge: {} } } } },
    ]) {
        const h = await fixture(settings); assert.equal(h.storage.isChapterUnlocked(10), false);
        assert.equal(h.storage.isBossLocked(10, 5), true); assert.equal(h.storage.getGameMode(), 'timed');
        unchanged(h);
    }
});

await check('review reset tolerates malformed and missing real saves without replacing their disk bytes', async () => {
    for (const raw of ['{invalid', 'null', '42', '[]', '"broken"', null]) {
        const h = await fixture({ raw }); assert.doesNotThrow(() => h.storage.resetAll());
        assert.equal(h.storage.getTotalStars(), 0); assert.equal(h.storage.isPremium(), false);
        assert.equal(h.storage.getGameMode(), 'zen'); unchanged(h);
    }
});

let clickableRows = 0;
await check('five localized review notices, Play→Chapters and all 50 accessible puzzle rows start their real level callbacks', async () => {
    const h = await fixture();
    globalThis.fetch = async url => ({ json: async () => JSON.parse(readFileSync(new URL('../' + url.split('?')[0], import.meta.url), 'utf8')) });
    const { ScreenManager } = await import(isolatedModule('screens.js', { './storage.js': h.moduleURL }));
    const { chapters } = await import('../js/data/chapters.js');
    const { getLevelsByChapter } = await import('../js/levels.js');
    const { loadLanguage, t } = await import('../js/i18n.js?v=2');
    const manager = new ScreenManager(); let started = 0, lastStarted = null;
    manager.onStartLevel = (level, chapter) => { started++; lastStarted = { level, chapter }; manager.showScreen('game'); };
    for (const lang of ['tr', 'en', 'es', 'fr', 'ja']) {
        await loadLanguage(lang, { persist: false }); manager.updateMenuDashboard();
        assert.notEqual(t('review.notice'), 'review.notice'); assert.notEqual(t('review.play'), 'review.play');
        assert.equal(el('menu-continue-title').textContent, t('review.play'));
        assert.equal(el('menu-continue-subtitle').textContent, t('review.notice'));
        assert.equal(el('menu-progress-value').textContent, '1/50'); assert.equal(el('menu-stars-value').textContent, '2/150');
        const before = started; el('btn-play').listeners.click();
        assert.equal(started, before, 'Review Play must show chapter choice instead of auto-starting a board');
        assert.ok(el('screen-chapters').classList.contains('active'));
        const chapterNotice = el('chapter-list').children.find(child => child.className?.includes('review-mode-notice'));
        assert.equal(chapterNotice?.getAttribute('role'), 'status'); assert.equal(chapterNotice.textContent, t('review.notice'));
        const chapterButtons = el('chapter-list').children.filter(child => child.tagName === 'BUTTON');
        assert.equal(chapterButtons.length, 10);
        for (let index = 0; index < chapters.length; index++) {
            assert.equal(chapterButtons[index].getAttribute('aria-disabled'), 'false');
            assert.equal(typeof chapterButtons[index].listeners.click, 'function');
            const chapter = chapters[index]; manager.showLevels(chapter);
            const levelNotice = el('level-list').children.find(child => child.className?.includes('review-mode-notice'));
            assert.equal(levelNotice.textContent, t('review.notice'));
            const rows = el('level-list').children.find(child => child.className?.includes('level-journey')).children;
            const levels = getLevelsByChapter(chapter.id); assert.equal(rows.length, 5);
            for (let number = 0; number < rows.length; number++) {
                assert.equal(rows[number].tagName, 'BUTTON'); assert.equal(rows[number].getAttribute('aria-disabled'), 'false');
                assert.equal(typeof rows[number].listeners.click, 'function'); rows[number].listeners.click();
                assert.equal(lastStarted.level.id, levels[number].id); assert.equal(lastStarted.chapter.id, chapter.id);
                clickableRows++;
            }
        }
    }
    assert.equal(started, 250); assert.equal(clickableRows, 250); unchanged(h);
});

console.log(JSON.stringify({ checks: checks.length, guardCases, clickableRows, passed: checks }, null, 2));
