import assert from 'node:assert/strict';

let clock = 1000;
let nextFrameId = 1;
const frames = new Map();
globalThis.performance = { now: () => clock };
globalThis.window = { devicePixelRatio: 2 };
globalThis.requestAnimationFrame = fn => {
    const id = nextFrameId++;
    frames.set(id, fn);
    return id;
};
globalThis.cancelAnimationFrame = id => frames.delete(id);

const { Game } = await import('../js/game.js');
const passed = [];
function check(name, test) { test(); passed.push(name); }
function frame(timestamp) {
    clock = Math.max(clock, timestamp);
    const batch = [...frames.values()];
    frames.clear();
    for (const callback of batch) callback(timestamp);
}
function fixture({ reducedMotion = false, width = 390, height = 500 } = {}) {
    clock = 1000;
    frames.clear();
    const calls = { draws: 0, radii: [], transforms: [], saves: 0, restores: 0, measured: 0 };
    const ctx = {
        save() { calls.saves++; },
        restore() { calls.restores++; },
        setTransform(...values) {
            values.forEach(value => assert.ok(Number.isFinite(value)));
            calls.transforms.push(values);
        },
        beginPath() {}, closePath() {}, stroke() {}, fill() {}, rect() {},
        moveTo() {}, lineTo() {},
        translate(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); },
        rotate(angle) { assert.ok(Number.isFinite(angle)); },
        arc(x, y, radius) {
            // Match CanvasRenderingContext2D's real negative-radius failure.
            if (radius < 0) throw new DOMException('The radius is negative', 'IndexSizeError');
            assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(radius));
            calls.radii.push(radius);
        },
    };
    const game = {
        _levelEpoch: 7,
        grid: {},
        canvas: { getBoundingClientRect() { calls.measured++; return { width, height }; } },
        renderer: { reducedMotion, ctx, drawGrid() { calls.draws++; } },
    };
    return { game, calls };
}
function start(game, callback) {
    // The real method must run: input-state's general fixture disables it.
    Game.prototype.playCelebration.call(game, callback);
}

check('RAF timestamp before performance.now never produces a negative shock radius, and normal completion fires once', () => {
    const { game, calls } = fixture();
    let completed = 0;
    start(game, () => completed++);
    assert.equal(frames.size, 1);
    frame(990); // Real browser regression: RAF's frame time predates startTime.
    assert.equal(completed, 0);
    assert.equal(calls.draws, 1);
    assert.equal(calls.radii[0], 0);
    assert.equal(frames.size, 1);
    frame(1100);
    assert.ok(calls.radii.some(radius => radius > 0));
    frame(1801);
    assert.equal(completed, 1);
    assert.equal(frames.size, 0);
    frame(2200);
    assert.equal(completed, 1);
    assert.equal(calls.saves, calls.restores);
    assert.deepEqual(calls.transforms[0], [2, 0, 0, 2, 0, 0]);
});

check('exactly 800ms expires immediately and does not require another RAF', () => {
    const { game, calls } = fixture();
    let completed = 0;
    start(game, () => completed++);
    frame(1799);
    assert.equal(completed, 0);
    assert.equal(frames.size, 1);
    const drawsBeforeExpiry = calls.draws;
    frame(1800);
    assert.equal(completed, 1);
    assert.equal(calls.draws, drawsBeforeExpiry);
    assert.equal(frames.size, 0);
});

check('reduced motion completes synchronously without measuring, drawing or scheduling particles', () => {
    const { game, calls } = fixture({ reducedMotion: true });
    let completed = 0;
    start(game, () => completed++);
    assert.equal(completed, 1);
    assert.equal(calls.measured, 0);
    assert.equal(calls.draws, 0);
    assert.equal(calls.radii.length, 0);
    assert.equal(frames.size, 0);
});

check('leaving or restarting before the first frame cancels the old result', () => {
    const { game, calls } = fixture();
    let staleResult = 0;
    start(game, () => staleResult++);
    game._levelEpoch++;
    frame(990);
    frame(1900);
    assert.equal(staleResult, 0);
    assert.equal(calls.draws, 0);
    assert.equal(calls.radii.length, 0);
    assert.equal(frames.size, 0);
});

check('an old in-flight celebration cannot deliver a result after the next level begins its own celebration', () => {
    const { game } = fixture();
    const results = [];
    start(game, () => results.push('old'));
    frame(1100);
    game._levelEpoch++;
    start(game, () => results.push('new'));
    assert.equal(frames.size, 2);
    frame(1150);
    assert.deepEqual(results, []);
    assert.equal(frames.size, 1);
    frame(1900); // New celebration began at 1100; its own 800ms expired.
    assert.deepEqual(results, ['new']);
    assert.equal(frames.size, 0);
});

check('a legitimately zero-size stage remains safe and still opens the result', () => {
    const { game, calls } = fixture({ width: 0, height: 0 });
    let completed = 0;
    start(game, () => completed++);
    frame(990);
    assert.equal(calls.radii[0], 0);
    frame(1200);
    frame(1801);
    assert.equal(completed, 1);
    assert.equal(frames.size, 0);
    assert.equal(calls.saves, calls.restores);
});

console.log(JSON.stringify({ checks: passed.length, passed }));
