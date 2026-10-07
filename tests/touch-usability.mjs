import assert from 'node:assert/strict';

// Exercise the real Game listeners, Renderer coordinate transforms and current
// campaign data. This is a deterministic DOM/clock fixture, not device testing.
let now = 10000, nextId = 1;
const timeouts = new Map(), intervals = new Map(), frames = new Map();
globalThis.performance = { now: () => now };
Date.now = () => now;
globalThis.setTimeout = (fn, delay = 0) => {
    const id = nextId++; timeouts.set(id, { fn, at: now + delay }); return id;
};
globalThis.clearTimeout = id => timeouts.delete(id);
globalThis.setInterval = fn => { const id = nextId++; intervals.set(id, fn); return id; };
globalThis.clearInterval = id => intervals.delete(id);
globalThis.requestAnimationFrame = fn => { const id = nextId++; frames.set(id, fn); return id; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
const memory = new Map();
globalThis.localStorage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key),
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.window = { devicePixelRatio: 1 };
const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        const classes = new Set();
        elements.set(id, {
            style: { setProperty() {} }, dataset: {}, textContent: '',
            classList: {
                add: (...items) => items.forEach(item => classes.add(item)),
                remove: (...items) => items.forEach(item => classes.delete(item)),
                contains: item => classes.has(item),
                toggle: (item, force) => {
                    const add = force ?? !classes.has(item);
                    if (add) classes.add(item); else classes.delete(item);
                    return add;
                },
            },
            addEventListener() {}, setAttribute() {}, focus() {},
        });
    }
    return elements.get(id);
}
globalThis.document = { getElementById: element, documentElement: element('root'), body: { dataset: {} }, hidden: false };
const { Game } = await import('../js/game.js');
const { hitTestPath } = await import('../js/hit-test.js');
const { allLevels } = await import('../js/levels.js');
const { chapters } = await import('../js/data/chapters.js');
const { storage } = await import('../js/storage.js');
const passed = [], failed = [];
let geometryCases = 0, gestureCases = 0, precisionCases = 0;
function check(name, fn) {
    try { fn(); passed.push(name); }
    catch (error) { failed.push({ name, error: error.message }); }
}
function advance(ms) {
    const until = now + ms;
    for (let count = 0; count < 1000; count++) {
        const next = [...timeouts].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) { now = until; return; }
        timeouts.delete(next[0]); now = next[1].at; next[1].fn();
    }
    throw new Error('Fixture timer loop did not settle');
}
const probe = {
    id: 'touch-probe', name: 'touch-probe', chapter: 1, gridWidth: 4, gridHeight: 4,
    paths: [
        { cells: [[0, 0]], direction: 'up' },
        { cells: [[1, 0]], direction: 'up' },
        { cells: [[2, 0]], direction: 'up' },
    ],
};
function fresh(level = probe, { width = 390, height = 600, sx = 1, sy = sx, dpr = 1, left = 21, top = 99 } = {}) {
    memory.clear(); timeouts.clear(); intervals.clear(); frames.clear(); elements.clear();
    document.hidden = false; window.devicePixelRatio = dpr;
    const listeners = {}, ctx = new Proxy({}, { get: () => () => {} });
    const canvas = {
        clientWidth: width, clientHeight: height,
        getContext: () => ctx,
        getBoundingClientRect: () => ({ left, top, width: canvas.clientWidth * sx, height: canvas.clientHeight * sy }),
        addEventListener: (name, fn) => { listeners[name] = fn; },
    };
    const game = new Game(canvas);
    for (const method of ['setTheme', 'drawGrid', 'drawHintHighlight', 'showCrackEffect']) game.renderer[method] = () => {};
    for (const method of ['startRenderLoop', 'stopRenderLoop', '_showFloatingScore', 'playCelebration']) game[method] = () => {};
    storage.setGameMode('zen');
    game.startLevel(level, chapters[level.chapter - 1]);
    const fired = [], wrong = [];
    game.removePathWithAnimation = path => fired.push(path);
    game.handleWrongMove = path => wrong.push(path);
    function event(name, touches = [], changedTouches = []) {
        listeners[name]({ touches, changedTouches, cancelable: true, preventDefault() {} });
    }
    return { game, canvas, listeners, event, fired, wrong, sx, sy };
}
function point(h, x, y, identifier = 11) {
    const r = h.game.renderer, rect = h.canvas.getBoundingClientRect();
    return {
        clientX: rect.left + (r.panX + r.shakeX + (r.gridOffsetX + x * r.cellSize) * r.scale) * h.sx,
        clientY: rect.top + (r.panY + r.shakeY + (r.gridOffsetY + y * r.cellSize) * r.scale) * h.sy,
        identifier,
    };
}
function headPoint(h, path, id = 11) { const c = path.getHead(); return point(h, c.x + .5, c.y + .5, id); }
function tap(h, down, up = down) { h.event('touchstart', [down], [down]); h.event('touchend', [], [up]); }
function hit(h, x, y) { const p = point(h, x, y); return hitTestPath(h.game.grid, h.game.renderer, p.clientX, p.clientY); }
function nearestCenterPath(h) {
    const rect = h.canvas.getBoundingClientRect();
    return [...h.game.grid.paths].sort((a, b) => {
        const distance = p => { const q = headPoint(h, p); return Math.hypot(q.clientX - rect.left - rect.width / 2, q.clientY - rect.top - rect.height / 2); };
        return distance(a) - distance(b);
    })[0];
}

check('all 45 real seal boards retain thin-shaft ownership with finger offsets, CSS transforms, DPR, pan and zoom', () => {
    const levels = allLevels.filter(level => level.balance?.authoring?.kind === 'seals');
    assert.equal(levels.length, 45, 'Audit the current seal campaign, not a toy replacement');
    for (const level of levels) for (const layout of [
        { width: 320, height: 450, dpr: 1 },
        { width: 390, height: 600, sx: .8, sy: 1.15, dpr: 3 },
        { width: 844, height: 300, sx: 1.1, sy: .9, dpr: 2 },
    ]) {
        const h = fresh(level, layout), r = h.game.renderer;
        r.scale = 1.6; r.panX = -19; r.panY = 27; r.shakeX = 1; r.shakeY = -2;
        for (const path of h.game.grid.paths) for (const cell of path.cells) {
            // Thin visual strokes remain selectable throughout their own cell,
            // including offsets much wider than the actual ink on dense fits.
            for (const [dx, dy] of [[0, 0], [.31, 0], [-.31, 0], [0, .31], [0, -.31]]) {
                assert.equal(hit(h, cell.x + .5 + dx, cell.y + .5 + dy), path, `${level.id} cell ${cell.x},${cell.y}`);
                geometryCases++;
            }
        }
    }
});

check('ambiguous empty-space ties and overlapping cells reject selection; clear nearest geometry is symmetric', () => {
    const level = { ...probe, paths: [
        { cells: [[1, 2]], direction: 'right' }, { cells: [[3, 2]], direction: 'left' },
    ] };
    const h = fresh(level, { width: 120, height: 120 });
    assert.equal(hit(h, 2.5, 2.5), null, 'Two equally close tips must not choose by array order');
    assert.equal(hit(h, 2.28, 2.5), h.game.grid.paths[0]);
    assert.equal(hit(h, 2.72, 2.5), h.game.grid.paths[1]);
    h.game.grid.paths.reverse();
    assert.equal(hit(h, 2.5, 2.5), null);
    const overlap = fresh({ ...probe, paths: [probe.paths[0], probe.paths[0]] });
    assert.equal(hit(overlap, .5, .5), null);
    for (const xy of [[NaN, 20], [20, Infinity], [-10000, 0]]) assert.equal(hitTestPath(h.game.grid, h.game.renderer, ...xy), null);
});

check('real wrong-rune paths keep exact ownership; eligibility never substitutes a neighboring legal move', () => {
    let count = 0;
    for (const level of allLevels.filter(level => level.balance?.authoring?.kind === 'seals')) {
        const h = fresh(level, { width: 320, height: 450 }), g = h.game.grid;
        const wrong = g.paths.find(path => !g.isRuneEligible(path));
        assert.ok(wrong, `${level.id} has a noncurrent rune`);
        const p = headPoint(h, wrong);
        assert.equal(hitTestPath(g, h.game.renderer, p.clientX, p.clientY), wrong);
        tap(h, p);
        assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, [wrong]); count++;
    }
    assert.equal(count, 45); gestureCases += count;
});

check('subthreshold finger drift previews and fires the actual lift owner, with no synthetic-click duplicate', () => {
    const h = fresh(probe, { width: 96, height: 96 });
    const down = point(h, .94, .5), up = point(h, 1.06, .5);
    h.event('touchstart', [down], [down]); h.event('touchmove', [up]);
    assert.equal(h.game.renderer.previewPath, h.game.grid.paths[1]);
    h.event('touchend', [], [up]);
    h.listeners.click({ ...up, detail: 1 });
    assert.deepEqual(h.fired, [h.game.grid.paths[1]]); gestureCases++;
});

check('direct 1→3, partial lift and 3→2→1 cannot fire or revive an arrow before every finger lifts', () => {
    for (const partialFirst of [false, true]) {
        const h = fresh(), a = headPoint(h, h.game.grid.paths[0], 11);
        const b = { ...a, clientX: a.clientX + 30, identifier: 22 }, c = { ...a, clientY: a.clientY + 30, identifier: 33 };
        h.event('touchstart', [a], [a]); h.event('touchstart', [a, b, c], [b, c]);
        assert.equal(h.game.renderer.previewPath, null);
        if (partialFirst) {
            h.event('touchend', [b, c], [a]); h.event('touchmove', [b, c]);
            h.event('touchend', [c], [b]); h.event('touchmove', [c]); h.event('touchend', [], [c]);
        } else h.event('touchend', [], [a, b, c]);
        assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, []);
        tap(h, headPoint(h, h.game.grid.paths[1], 44)); assert.equal(h.fired.length, 1, 'Fresh one-finger gesture recovers');
        gestureCases++;
    }
});

check('ordinary pinch 2→1 stays a gesture; third-finger replacement cannot cause a pinch jump', () => {
    const h = fresh(), a = headPoint(h, h.game.grid.paths[0], 11), b = { ...a, clientX: a.clientX + 40, identifier: 22 };
    h.event('touchstart', [a], [a]); h.event('touchstart', [a, b], [b]);
    h.event('touchmove', [a, { ...b, clientX: b.clientX + 20 }]);
    assert.ok(Number.isFinite(h.game.renderer.scale)); assert.equal(h.game.renderer.previewPath, null);
    h.event('touchend', [a], [b]); h.event('touchmove', [a]); h.event('touchend', [], [a]);
    assert.deepEqual(h.fired, []);
    const c = { ...a, clientY: a.clientY + 50, identifier: 33 };
    h.event('touchstart', [a, b], [a, b]); h.event('touchstart', [a, b, c], [c]);
    const scale = h.game.renderer.scale;
    h.event('touchend', [a, c], [b]); h.event('touchmove', [a, { ...c, clientY: c.clientY + 100 }]);
    assert.equal(h.game.renderer.scale, scale, 'A changed pair after three fingers must remain cancelled');
    h.event('touchend', [], [a, c]); assert.deepEqual(h.fired, []); gestureCases++;
});

check('touch identifiers reject replacement IDs and multiple changed fingers without accidental selection', () => {
    for (const kind of ['wrong-lift', 'wrong-move', 'changed-order']) {
        const h = fresh(probe, { width: 96, height: 96 }), a = headPoint(h, h.game.grid.paths[0], 11);
        const b = headPoint(h, h.game.grid.paths[1], 99);
        h.event('touchstart', [a], [a]);
        if (kind === 'wrong-move') { h.event('touchmove', [b]); h.event('touchend', [], [b]); }
        else h.event('touchend', [], kind === 'changed-order' ? [b, a] : [b]);
        assert.deepEqual(h.fired, [], kind);
        gestureCases++;
    }
    const h = fresh(), a = headPoint(h, h.game.grid.paths[0]); delete a.identifier;
    tap(h, a); assert.deepEqual(h.fired, [h.game.grid.paths[0]], 'Legacy synthetic/nonidentified touch still works');
});

check('zero-distance pinch never writes NaN/Infinity and resumes with a finite baseline', () => {
    const h = fresh(), a = headPoint(h, h.game.grid.paths[0]), b = { ...a, identifier: 22 };
    h.event('touchstart', [a, b], [a, b]);
    h.event('touchmove', [a, b]); h.event('touchmove', [a, { ...b, clientX: b.clientX + 40 }]);
    for (const value of [h.game.renderer.scale, h.game.renderer.panX, h.game.renderer.panY]) assert.ok(Number.isFinite(value));
    assert.ok(h.game.renderer.scale >= h.game.renderer.minScale && h.game.renderer.scale <= h.game.renderer.maxScale);
    h.event('touchend', [], [a, b]); assert.deepEqual(h.fired, []); gestureCases++;
});

check('a queued arrow survives normal zoom by identity, but starting pinch or pan cancels that action', () => {
    for (const kind of ['identity', 'pinch', 'pan']) {
        const h = fresh(), p = headPoint(h, h.game.grid.paths[1]);
        h.game.isAnimating = true; tap(h, p);
        if (kind === 'identity') h.game.renderer.setZoom(2, p.clientX, p.clientY);
        else if (kind === 'pinch') h.event('touchstart', [p, { ...p, identifier: 22, clientX: p.clientX + 40 }]);
        else { h.event('touchstart', [p]); h.event('touchmove', [{ ...p, clientX: p.clientX + 25 }]); }
        h.game.isAnimating = false; h.game._processQueuedTap();
        assert.deepEqual(h.fired, kind === 'identity' ? [h.game.grid.paths[1]] : [], kind); gestureCases++;
    }
});

check('magnified real seal boards can pan to every outer edge and remain reachable after extreme drags', () => {
    for (const level of allLevels.filter(level => level.balance?.authoring?.kind === 'seals')) {
        const h = fresh(level, { width: 320, height: 450, sx: .8, sy: 1.15 }), r = h.game.renderer;
        const b = r._boardShapeBounds, rect = h.canvas.getBoundingClientRect();
        r.setZoom(r.maxScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
        for (const [dx, dy] of [[1e7, 1e7], [-1e7, -1e7]]) {
            r.setPan(dx, dy);
            const x = dx > 0 ? b.left : b.right;
            const y = dy > 0 ? b.top : b.bottom;
            const edge = point(h, x, y);
            assert.ok(edge.clientX >= rect.left - 1e-8 && edge.clientX <= rect.left + rect.width + 1e-8, `${level.id}: horizontal edge reachable`);
            assert.ok(edge.clientY >= rect.top - 1e-8 && edge.clientY <= rect.top + rect.height + 1e-8, `${level.id}: vertical edge reachable`);
            const edgeCell = point(h, x + (dx > 0 ? .5 : -.5), y + (dy > 0 ? .5 : -.5));
            assert.ok(edgeCell.clientX >= rect.left && edgeCell.clientX <= rect.left + rect.width);
            assert.ok(edgeCell.clientY >= rect.top && edgeCell.clientY <= rect.top + rect.height);
            gestureCases++;
        }
        assert.deepEqual(h.fired, []);
    }
});

check('180ms precision hold zooms about the finger, selects without firing and releases once after 350ms', () => {
    const level = allLevels.find(level => level.id === 'final_5') ?? allLevels.at(-1);
    for (const layout of [
        { width: 320, height: 450 }, { width: 390, height: 600, sx: .8, sy: 1.15, dpr: 3 },
        { width: 844, height: 300, sx: 1.1, sy: .9, dpr: 2 },
    ]) {
        const h = fresh(level, layout), path = nearestCenterPath(h), p = headPoint(h, path), r = h.game.renderer;
        const original = r.getFractionalCellFromPoint(p.clientX, p.clientY);
        h.event('touchstart', [p], [p]); advance(179);
        assert.equal(r.scale, 1, 'Short taps do not cause an unexpected zoom');
        advance(1);
        const pitch = r.cellSize * r.scale * Math.min(h.sx, h.sy);
        assert.ok(pitch >= 26 - 1e-8, `Precision cell is ${pitch} physical CSS px`);
        const anchored = r.getFractionalCellFromPoint(p.clientX, p.clientY);
        assert.ok(Math.abs(anchored.fx - original.fx) < 1e-8 && Math.abs(anchored.fy - original.fy) < 1e-8, 'Finger remains anchored on the selected cell');
        assert.equal(r.previewPath, path); assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, []);
        advance(420); h.event('touchend', [], [p]);
        assert.deepEqual([...h.fired, ...h.wrong], [path]);
        h.listeners.click({ ...p, detail: 1 }); assert.equal(h.fired.length + h.wrong.length, 1);
        assert.equal(r.previewPath, null); assert.ok(r.scale > 1, 'The magnified board stays available after release'); precisionCases++;
    }
});

check('precision hold follows the final visible pointer, preserving wrong-rune ownership', () => {
    const h = fresh({ ...probe, runeCycle: [0, 1], paths: [
        { cells: [[0, 0]], direction: 'up', rune: 0 },
        { cells: [[1, 0]], direction: 'up', rune: 1 },
    ] }, { width: 96, height: 96 });
    const a = point(h, .96, .5), b = point(h, 1.04, .5);
    h.event('touchstart', [a]); advance(180);
    const lift = headPoint(h, h.game.grid.paths[1]);
    // Use a small final slide at the magnified cell boundary rather than an
    // entire-cell jump: the release is the visible owner, not eligibility.
    const after = point(h, 1.04, .5); h.event('touchmove', [after]); advance(300);
    assert.equal(h.game.renderer.previewPath, h.game.grid.paths[1]);
    h.event('touchend', [], [after]); assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, [h.game.grid.paths[1]]);
    assert.ok(Number.isFinite(b.clientX + lift.clientX)); precisionCases++;
});

check('precision timers cannot zoom or fire after cancel, pan, pinch, three fingers, restart, leave, resize or hidden view', () => {
    for (const kind of ['cancel', 'pan', 'pinch', 'three', 'restart', 'leave', 'resize', 'hidden']) {
        const h = fresh(), p = headPoint(h, h.game.grid.paths[0]);
        h.event('touchstart', [p]);
        const oldCallbacks = [...timeouts.values()].filter(timer => timer.at === now + 180).map(timer => timer.fn);
        assert.equal(oldCallbacks.length, 1, 'Exactly one scheduled precision hold');
        if (kind === 'cancel') h.event('touchcancel');
        if (kind === 'pan') h.event('touchmove', [{ ...p, clientX: p.clientX + 30 }]);
        if (kind === 'pinch') h.event('touchstart', [p, { ...p, identifier: 22, clientX: p.clientX + 50 }]);
        if (kind === 'three') h.event('touchstart', [p, { ...p, identifier: 22 }, { ...p, identifier: 33 }]);
        if (kind === 'restart') h.game.startLevel(probe, chapters[0]);
        if (kind === 'leave') h.game.leaveLevel();
        if (kind === 'resize') { h.canvas.clientWidth = 844; h.canvas.clientHeight = 300; h.game.handleResize(); }
        if (kind === 'hidden') { document.hidden = true; h.game.handleVisibilityChange(true); }
        const scale = h.game.renderer.scale;
        advance(180); oldCallbacks.forEach(fn => fn()); // A callback already dispatched before clear must also be harmless.
        assert.equal(h.game.renderer.scale, scale, kind);
        assert.equal(h.game.renderer.previewPath, null, kind);
        h.event('touchend', [], [p]); assert.deepEqual(h.fired, [], kind); assert.deepEqual(h.wrong, [], kind); precisionCases++;
    }
});

check('a held finger expires after 5 seconds, and cancelled/long empty touches never fire arrows', () => {
    const h = fresh(), p = headPoint(h, h.game.grid.paths[0]);
    h.event('touchstart', [p]); advance(5001); h.event('touchend', [], [p]);
    assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, []); assert.equal(h.game.renderer.previewPath, null);
    const empty = point(h, 3.5, 3.5); h.event('touchstart', [empty]); advance(600); h.event('touchend', [], [empty]);
    assert.deepEqual(h.fired, []); assert.deepEqual(h.wrong, []); precisionCases++;
});

timeouts.clear(); intervals.clear(); frames.clear();
console.log(JSON.stringify({ scope: 'Actual listeners and coordinate transforms; no physical finger/device claim', passed: passed.length, failed: failed.length, geometryCases, gestureCases, precisionCases, checks: passed, failures: failed }, null, 2));
if (failed.length) process.exitCode = 1;
