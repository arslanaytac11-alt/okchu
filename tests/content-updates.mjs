import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    createContentUpdateClient, validateContentPacket, CONTENT_UPDATE_URL,
    CONTENT_CACHE_KEY, CONTENT_MAX_BYTES,
} from '../js/content-updates.js';

const passed = [];
async function check(name, fn) { await fn(); passed.push(name); }
const packet = (revision = 1, changes = {}) => ({
    schemaVersion: 1, appVersion: '1.1.1', nativeBuild: 149, revision,
    texts: {}, disableAds: {}, ...changes,
});
const encoded = value => JSON.stringify(value);
const response = (value, options) => new Response(typeof value === 'string' ? value : encoded(value), options);
function fixture({ cached, native = true, review = false, fetchImpl, timeoutMs } = {}) {
    const values = new Map(cached === undefined ? [] : [[CONTENT_CACHE_KEY, typeof cached === 'string' ? cached : encoded(cached)]]);
    const counts = { reads: 0, writes: 0, fetches: 0 };
    const environment = {
        window: native ? { Capacitor: { isNativePlatform: () => true } } : {},
        location: { href: review ? 'http://127.0.0.1:5188/?kontrol=1' : 'https://example.com/' },
        localStorage: {
            getItem: key => { counts.reads++; return values.get(key) ?? null; },
            setItem: (key, value) => { counts.writes++; values.set(key, value); },
        },
        fetch: async (...args) => { counts.fetches++; return fetchImpl ? fetchImpl(...args) : response(packet()); },
    };
    const client = createContentUpdateClient({ environment, timeoutMs });
    return { client, values, counts, environment };
}

await check('the committed stable packet is compatible, revision1 and genuinely no-op', () => {
    const stable = validateContentPacket(readFileSync(new URL('../ota/1.1.1.json', import.meta.url), 'utf8'));
    assert.deepEqual(stable, packet()); assert.deepEqual(stable.texts, {}); assert.deepEqual(stable.disableAds, {});
});
await check('previous release packet is rejected without changing its endpoint or contents',()=>{
 const previous=readFileSync(new URL('../ota/stable.json',import.meta.url),'utf8');
 assert.equal(validateContentPacket(previous),null);assert.equal(JSON.parse(previous).nativeBuild,148);
});
await check('all five existing languages and exactly the approved21 copy keys accept plain text', () => {
    for (const language of ['tr', 'en', 'es', 'fr', 'ja']) {
        const texts = { 'game.zoom_hint': 'Hold the arrow · ○ ◇ △ □' };
        for (let chapter = 1; chapter <= 10; chapter++) {
            texts[`civilizations.${chapter}.text`] = 'A revised story paragraph.';
            texts[`civilizations.${chapter}.mystery`] = 'Read the existing signs.';
        }
        assert.ok(validateContentPacket(encoded(packet(2, { texts: { [language]: texts } }))));
    }
});
await check('schema rejects unknown fields, version/build mismatch, missing keys and invalid revisions', () => {
    const variants = [
        null, [], { ...packet(), code: 'alert(1)' }, { ...packet(), schemaVersion: 2 },
        { ...packet(), appVersion: '1.2.0' }, { ...packet(), nativeBuild: 148 },
        ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '2'].map(revision => packet(revision)),
        { ...packet(), texts: [] }, { ...packet(), disableAds: [] },
    ];
    const missing = packet(); delete missing.nativeBuild; variants.push(missing);
    for (const value of variants) assert.equal(validateContentPacket(encoded(value)), null);
    assert.equal(validateContentPacket('{'), null); assert.equal(validateContentPacket({}), null);
});
await check('HTML, encoded markup, controls, bidi, lone surrogates and oversized strings are rejected', () => {
    for (const value of ['<img src=x>', '&lt;script&gt;', 'a\u0000b', 'a\nb', '\u202eabc', '\u2066abc', 'a\u200bb', '\ud800', '', 'x'.repeat(161)]) {
        assert.equal(validateContentPacket(encoded(packet(2, { texts: { en: { 'game.zoom_hint': value } } }))), null, JSON.stringify(value));
    }
    assert.ok(validateContentPacket(encoded(packet(2, { texts: { ja: { 'game.zoom_hint': '矢印を長押し · 🔎' } } }))));
});
await check('prototype keys, unapproved copy, executable payloads, puzzle data and native flags are rejected', () => {
    for (const raw of [
        '{"schemaVersion":1,"appVersion":"1.1.1","nativeBuild":149,"revision":2,"texts":{},"disableAds":{},"__proto__":{}}',
        encoded(packet(2, { texts: { en: JSON.parse('{"__proto__":"bad"}') } })),
        encoded(packet(2, { texts: { constructor: {} } })),
        encoded(packet(2, { texts: { en: { 'game.play_hint': 'Unknown key' } } })),
        encoded(packet(2, { texts: { en: { 'settings.privacy': 'Changed disclosure' } } })),
        encoded({ ...packet(), puzzles: [] }), encoded({ ...packet(), html: '<p>New UI</p>' }),
        encoded({ ...packet(), permissions: {} }), encoded({ ...packet(), adUnits: {} }),
    ]) assert.equal(validateContentPacket(raw), null);
    assert.equal({}.polluted, undefined);
});
await check('the32KB limit counts UTF8 bytes rather than character length', () => {
    const texts = Object.fromEntries(['tr', 'en', 'es', 'fr', 'ja'].map(lang => [lang, { 'civilizations.1.text': '界'.repeat(2500) }]));
    const raw = encoded(packet(2, { texts }));
    assert.ok(raw.length < CONTENT_MAX_BYTES); assert.ok(new TextEncoder().encode(raw).length > CONTENT_MAX_BYTES);
    assert.equal(validateContentPacket(raw), null);
});
await check('ad configuration can only disable the existing three types, with no enabling/frequency/ID control', () => {
    assert.ok(validateContentPacket(encoded(packet(2, { disableAds: { banner: true, interstitial: true, rewarded: true } }))));
    for (const disableAds of [{ banner: false }, { banner: 1 }, { banner: 'true' }, { popup: true }, { frequency: 10 }, { id: 'new' }]) {
        assert.equal(validateContentPacket(encoded(packet(2, { disableAds }))), null);
    }
});
await check('browser and loopback inspection perform zero network/storage operations, even with valid cached overrides', async () => {
    for (const review of [false, true]) {
        const h = fixture({ native: false, review, cached: packet(2, { texts: { en: { 'game.zoom_hint': 'Cached' } }, disableAds: { banner: true } }) });
        assert.equal(h.client.loadCachedContentUpdates(), null);
        assert.equal(h.client.getContentText('en', 'game.zoom_hint'), undefined);
        assert.equal(h.client.isAdTypeDisabled('banner'), false);
        assert.equal((await h.client.initializeContentUpdates()).status, 'disabled');
        assert.deepEqual(h.counts, { reads: 0, writes: 0, fetches: 0 });
    }
});
await check('cached content is captured once; downloaded content activates only in a new launch', async () => {
    const old = packet(2, { texts: { en: { 'game.zoom_hint': 'Old help' } } });
    const next = packet(3, { texts: { en: { 'game.zoom_hint': 'New help' } }, disableAds: { banner: true } });
    const h = fixture({ cached: old, fetchImpl: () => response(next) });
    const snapshot = h.client.loadCachedContentUpdates();
    assert.equal(h.client.getContentText('en', 'game.zoom_hint'), 'Old help');
    assert.deepEqual(await h.client.initializeContentUpdates(), { status: 'staged', activeRevision: 2, stagedRevision: 3 });
    assert.equal(h.client.loadCachedContentUpdates(), snapshot);
    assert.equal(h.client.getContentText('en', 'game.zoom_hint'), 'Old help');
    assert.equal(h.client.isAdTypeDisabled('banner'), false);
    const nextLaunch = createContentUpdateClient({ environment: h.environment });
    assert.equal(nextLaunch.getContentText('en', 'game.zoom_hint'), 'New help');
    assert.equal(nextLaunch.isAdTypeDisabled('banner'), true);
    assert.throws(() => { snapshot.texts.en['game.zoom_hint'] = 'Mutated'; }, TypeError);
});
await check('empty or corrupt offline cache keeps the bundled default and cannot invent ad permission', async () => {
    for (const cached of [undefined, '{', packet(5, { nativeBuild: 148 }), packet(5, { disableAds: { banner: false } })]) {
        const h = fixture({ cached, fetchImpl: () => { throw new Error('Offline'); } });
        assert.equal(h.client.getContentText('en', 'game.zoom_hint'), undefined);
        assert.equal(h.client.isAdTypeDisabled('banner'), false);
        assert.equal((await h.client.initializeContentUpdates()).status, 'unavailable'); assert.equal(h.counts.writes, 0);
    }
});
await check('monotonic revisions reject same/older packets and protect a newer staged packet from downgrade', async () => {
    let served = packet(3); const h = fixture({ cached: packet(2), fetchImpl: () => response(served) });
    assert.equal((await h.client.initializeContentUpdates()).status, 'staged');
    served = packet(2); assert.equal((await h.client.initializeContentUpdates()).status, 'unchanged');
    served = packet(3); assert.equal((await h.client.initializeContentUpdates()).status, 'unchanged');
    assert.equal(h.counts.writes, 1); assert.equal(JSON.parse(h.values.get(CONTENT_CACHE_KEY)).revision, 3);
});
await check('concurrent startup calls share one request; fixed HTTPS uses no cookies or redirect follow', async () => {
    let complete, options, url;
    const h = fixture({ fetchImpl: (u, o) => { url = u; options = o; return new Promise(resolve => { complete = resolve; }); } });
    const a = h.client.initializeContentUpdates(), b = h.client.initializeContentUpdates();
    assert.equal(h.counts.fetches, 1); complete(response(packet()));
    assert.equal((await a).status, 'staged'); assert.equal((await b).status, 'staged');
    assert.equal(url, CONTENT_UPDATE_URL); assert.ok(url.startsWith('https://'));
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.cache, 'no-store'); assert.equal(h.counts.writes, 1);
});
await check('HTTP errors, foreign final URLs and declared oversized responses keep the valid offline snapshot', async () => {
    for (const fetchImpl of [
        () => response('Denied', { status: 403 }),
        () => ({ ok: true, url: 'https://foreign.example/config.json', text: () => encoded(packet(3)) }),
        () => response(packet(3), { headers: { 'content-length': String(CONTENT_MAX_BYTES + 1) } }),
        () => response(packet(3), { headers: { 'content-length': 'invalid' } }),
    ]) {
        const h = fixture({ cached: packet(2, { disableAds: { rewarded: true } }), fetchImpl });
        assert.equal((await h.client.initializeContentUpdates()).status, 'unavailable');
        assert.equal(h.client.isAdTypeDisabled('rewarded'), true); assert.equal(h.counts.writes, 0);
    }
});
await check('streaming response aborts beyond32KB and rejects malformed UTF8 without caching', async () => {
    let cancelled = false;
    const body = new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(20000)); controller.enqueue(new Uint8Array(20000)); },
        cancel() { cancelled = true; },
    });
    const h = fixture({ fetchImpl: () => new Response(body) });
    assert.equal((await h.client.initializeContentUpdates()).status, 'unavailable'); assert.equal(cancelled, true); assert.equal(h.counts.writes, 0);
    const invalid = fixture({ fetchImpl: () => new Response(new Uint8Array([0xff])) });
    assert.equal((await invalid.client.initializeContentUpdates()).status, 'unavailable'); assert.equal(invalid.counts.writes, 0);
});
await check('hung fetch is bounded, aborts, and leaves valid offline state usable', async () => {
    let signal; const h = fixture({ cached: packet(2), timeoutMs: 5, fetchImpl: (_, options) => { signal = options.signal; return new Promise(() => {}); } });
    assert.equal((await h.client.initializeContentUpdates()).status, 'unavailable'); assert.equal(signal.aborted, true);
    assert.equal(h.client.loadCachedContentUpdates().revision, 2); assert.equal(h.counts.writes, 0);
});
await check('storage denial and a lost native context cannot stage content or affect this launch', async () => {
    const denied = fixture(); denied.environment.localStorage.setItem = () => { throw new Error('Quota'); };
    assert.equal((await denied.client.initializeContentUpdates()).status, 'unavailable'); assert.equal(denied.client.loadCachedContentUpdates(), null);
    let complete; const h = fixture({ fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
    const pending = h.client.initializeContentUpdates(); h.environment.window = {}; complete(response(packet()));
    assert.equal((await pending).status, 'unavailable'); assert.equal(h.counts.writes, 0);
});
await check('lookups cannot expose inherited/prototype or unapproved keys', () => {
    const h = fixture({ cached: packet(2, { texts: { en: { 'game.zoom_hint': 'Safe' } } }) });
    for (const key of ['constructor', '__proto__', 'toString', 'settings.privacy']) assert.equal(h.client.getContentText('en', key), undefined);
    assert.equal(h.client.getContentText('constructor', 'game.zoom_hint'), undefined);
    assert.equal(h.client.isAdTypeDisabled('__proto__'), false);
});
await check('actual i18n.t uses native cached allowlisted copy; missing keys and review browser retain bundled translations', async () => {
    const values = new Map([[CONTENT_CACHE_KEY, encoded(packet(7, { texts: { en: { 'game.zoom_hint': 'Precise native help' } } }))]]);
    globalThis.window = { Capacitor: { isNativePlatform: () => true } };
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    globalThis.document = { documentElement: {} };
    globalThis.fetch = async url => {
        assert.match(url, /^lang\/en\.json\?v=\d+$/);
        return response(readFileSync(new URL('../lang/en.json', import.meta.url), 'utf8'));
    };
    const { loadLanguage, t } = await import('../js/i18n.js');
    await loadLanguage('en', { persist: false });
    assert.equal(t('game.zoom_hint'), 'Precise native help'); assert.equal(t('game.score'), 'Score'); assert.equal(t('not.found'), 'not.found');
    window = {}; globalThis.location = { href: 'http://127.0.0.1:5188/?kontrol=1' };
    assert.equal(t('game.zoom_hint'), 'Hold an arrow for precision · Pinch to zoom');
});

console.log(JSON.stringify({ passed: passed.length, scope: 'Actual content client/schema/streaming/cache/i18n; mocked transport, no remote publication or Store approval claim', checks: passed }, null, 2));
