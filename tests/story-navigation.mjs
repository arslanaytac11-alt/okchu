import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const memory = new Map();
globalThis.localStorage = {
    getItem: key => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
};
globalThis.window = {};

function element(tagName = 'div') {
    const classes = new Set();
    const attributes = new Map();
    return {
        tagName: tagName.toUpperCase(), dataset: {}, style: { setProperty() {} },
        classList: {
            add(key) { classes.add(key); },
            remove(key) { classes.delete(key); },
            toggle(key, value) { if (value) classes.add(key); else classes.delete(key); },
            contains: key => classes.has(key),
        },
        children: [], listeners: {},
        appendChild(child) { this.children.push(child); },
        append(...children) { this.children.push(...children); },
        setAttribute(key, value) { attributes.set(key, value); },
        getAttribute: key => attributes.get(key) ?? null,
        addEventListener(key, callback) { this.listeners[key] = callback; },
        getContext: () => new Proxy({}, { get: () => () => {} }),
        set innerHTML(_) { this.children = []; },
        get innerHTML() { return ''; },
    };
}
const elements = new Map();
function el(key) {
    if (!elements.has(key)) elements.set(key, element());
    return elements.get(key);
}
globalThis.document = {
    getElementById: el, documentElement: element(), body: { dataset: {} },
    querySelector: () => element(), createElement: element, createElementNS: (_, name) => element(name),
    createTextNode: text => ({ textContent: text }),
};
const { ScreenManager } = await import('../js/screens.js');
const { chapters } = await import('../js/data/chapters.js');
const { allLevels, getLevelsByChapter, getNextLevel } = await import('../js/levels.js');
const { storage } = await import('../js/storage.js');
const { loadLanguage, t } = await import('../js/i18n.js?v=3');
globalThis.fetch = async url => ({
    json: async () => JSON.parse(readFileSync(new URL('../' + url.split('?')[0], import.meta.url), 'utf8')),
});

let checks = 0;
let started = 0;
let lastStarted = null;
const manager = new ScreenManager();
const startLevel = (level, chapter) => {
    started++;
    lastStarted = { level, chapter };
    manager.showScreen('game');
};
manager.onStartLevel = startLevel;
el('btn-play').listeners.click();
assert.equal(lastStarted.level.id, 'egypt_1');
assert.equal(lastStarted.chapter.id, 1);
assert.ok(el('screen-game').classList.contains('active'));
assert.equal(el('level-list').children.length, 0, 'Home play must start without a level selection screen');
el('btn-game-back').listeners.click();
assert.ok(el('screen-levels').classList.contains('active'));
assert.equal(el('level-list').children.at(-1).children.length, 5, 'Back from a home launch must populate the chapter');
checks++;
for (const lang of ['tr', 'en', 'es', 'fr', 'ja']) {
    await loadLanguage(lang, { persist: false });
    manager.showChapters();
    const chapterButtons = el('chapter-list').children;
    assert.equal(chapterButtons.length, 10);
    assert.equal(chapterButtons[0].tagName, 'BUTTON');
    assert.equal(chapterButtons[1].getAttribute('aria-disabled'), 'true');
    assert.equal(chapterButtons[1].listeners.click, undefined, 'Locked chapters must not open');
    checks++;
    for (const chapter of chapters) {
        manager.currentChapter = chapter;
        manager.showStory(chapter);
        assert.ok(el('screen-story').classList.contains('active'));
        assert.ok(el('story-text').textContent.length > 0, `${lang} ${chapter.id}`);
        assert.ok(el('story-title').textContent.length > 0);
        assert.equal(el('story-facts').children.length, 4);
        assert.equal(el('story-image').alt, t(`civilizations.${chapter.id}.name`));
        manager.showLevels(chapter);
        assert.ok(el('screen-levels').classList.contains('active'));
        const rows = el('level-list').children.at(-1).children;
        assert.equal(rows.length, 5);
        assert.equal(rows[0].tagName, 'BUTTON', 'Puzzle rows need native keyboard activation');
        assert.equal(rows[0].getAttribute('aria-disabled'), 'false');
        assert.equal(rows[4].getAttribute('aria-disabled'), 'true');
        assert.equal(rows[4].listeners.click, undefined, 'Locked final puzzles must not start');
        assert.ok(rows[0].className.includes('next-up'));
        rows[0].listeners.click();
        const level = getLevelsByChapter(chapter.id)[0];
        const shapeKey = `shapes.${level.shape}`;
        const localizedShape = t(shapeKey);
        if (level.shape && localizedShape !== shapeKey && t(`puzzles.${level.id}`) === `puzzles.${level.id}`) {
            assert.equal(rows[0].children[1].children[1].textContent, localizedShape);
        }
        checks++;
    }
}
assert.equal(started, 51, 'Playable rows must preserve the start callback');
for (let index = 0; index < allLevels.length; index++) {
    assert.equal(getNextLevel(allLevels[index].id), allLevels[index + 1] || null);
    checks++;
}

storage.setLastPlayed(1, 'egypt_1');
storage.completeLevel('egypt_1', 1);
manager.updateMenuDashboard();
assert.equal(el('menu-progress-value').textContent, '1/50');
assert.ok(el('menu-continue-subtitle').textContent.includes('2'));
el('btn-play').listeners.click();
assert.equal(manager.currentChapter.id, 1);
assert.equal(lastStarted.level.id, 'egypt_2', 'Home continuation must launch the puzzle shown on its card');
assert.ok(el('screen-game').classList.contains('active'));
el('btn-game-back').listeners.click();
assert.ok(el('screen-levels').classList.contains('active'));
const resumeRows = el('level-list').children.at(-1).children;
assert.ok(resumeRows[0].className.includes('completed'));
assert.ok(resumeRows[1].className.includes('next-up'), 'Resume must highlight the first unfinished puzzle');
el('btn-explore').listeners.click();
assert.ok(el('screen-chapters').classList.contains('active'));
checks++;

storage.setLastPlayed(2, 'greek_1');
el('btn-play').listeners.click();
assert.equal(lastStarted.chapter.id, 1, 'Continuation must not enter a locked chapter');
assert.equal(lastStarted.level.id, 'egypt_2');
storage.setLastPlayed(1, 'egypt_5');
for (let index = 2; index <= 4; index++) storage.completeLevel(`egypt_${index}`, 1);
el('btn-play').listeners.click();
assert.equal(lastStarted.level.id, 'egypt_1', 'A locked final puzzle must fall back to an eligible replay');
manager.onStartLevel = null;
el('btn-play').listeners.click();
assert.ok(el('screen-levels').classList.contains('active'), 'Missing game callbacks must retain a usable level list');
manager.onStartLevel = startLevel;
checks++;

storage.setGameMode('zen');
manager.showLevels(chapters[0]);
let modeButtons = el('level-list').children[0].children;
assert.equal(modeButtons[2].getAttribute('aria-pressed'), 'true');
assert.equal(modeButtons[0].getAttribute('aria-pressed'), 'false');
modeButtons[1].listeners.click();
assert.equal(storage.getGameMode(), 'timed');
modeButtons = el('level-list').children[0].children;
assert.equal(modeButtons[1].getAttribute('aria-pressed'), 'true');
checks++;

for (const chapter of chapters) {
    assert.equal(storage.isBossLocked(chapter.id, 5), true);
    for (let index = 1; index <= 4; index++) {
        storage.saveLevelScore(`${storage.getChapterPrefix(chapter.id)}_${index}`, { score: 100, stars: 2 });
    }
    assert.equal(storage.isBossLocked(chapter.id, 5), false);
    manager.showLevels(chapter);
    const boss = el('level-list').children.at(-1).children[4];
    assert.equal(boss.getAttribute('aria-disabled'), 'false');
    assert.equal(typeof boss.listeners.click, 'function');
    checks++;
}
console.log(JSON.stringify({
    passed: checks, languages: 5, chapters: 10,
    scope: 'DOM mocks: localized story/level routing, native buttons, locked actions, mode selection, direct home launch and persisted continuation; no visual/native-device assertions',
}, null, 2));
