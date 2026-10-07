import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

// Link real ES modules without evaluating DOM/plugin code. The flag is local
// to this test subprocess; errors/timeouts still fail the aggregate normally.
if (typeof vm.SourceTextModule !== 'function') {
    const child = spawnSync(process.execPath, ['--experimental-vm-modules', fileURLToPath(import.meta.url)], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stdout + child.stderr);
    process.stdout.write(child.stdout);
} else {
    await run();
}

async function run() {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const origin = 'http://127.0.0.1:5188';
    const urlOf = value => new URL(typeof value === 'string' ? value : value.url, origin);
    const bytesAt = value => readFileSync(resolve(root, '.' + urlOf(value).pathname));
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => ({
        type: tag.match(/\btype=["']([^"']+)["']/)?.[1], src: tag.match(/\bsrc=["']([^"']+)["']/)?.[1],
    })).filter(script => script.type === 'module' && script.src);
    assert.ok(scripts.length, 'The actual page must have a module entry');

    const onlineModules = new Map();
    function sourceModule(url) {
        assert.equal(url.origin, origin, 'Boot modules must resolve locally');
        if (!onlineModules.has(url.href)) onlineModules.set(url.href, new vm.SourceTextModule(bytesAt(url.href).toString(), { identifier: url.href }));
        return onlineModules.get(url.href);
    }
    for (const script of scripts) {
        const entry = sourceModule(new URL(script.src, origin + '/'));
        await entry.link((specifier, parent) => sourceModule(new URL(specifier, parent.identifier)));
    }

    // Cache Storage stores complete response bytes/headers; every lookup returns
    // an independent Response, including ignoreSearch behavior used by this SW.
    const buckets = new Map(), handlers = new Map(), requests = [];
    let online = true;
    const overrides = new Map();
    const network = async value => {
        const url = urlOf(value); requests.push(url.href);
        if (!online) throw new TypeError('Offline test network');
        try {
            const body = overrides.get(url.pathname) ?? bytesAt(url.pathname === '/' ? '/index.html' : url.href);
            const type = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg' }[extname(url.pathname)] || 'text/html';
            return new Response(body, { headers: { 'Content-Type': type } });
        } catch { return new Response('Missing test resource', { status: 404 }); }
    };
    class MemoryCache {
        items = new Map();
        async put(value, response) { this.items.set(urlOf(value).href, { body: new Uint8Array(await response.arrayBuffer()), status: response.status, headers: [...response.headers] }); }
        async add(value) { const response = await network(value); if (!response.ok) throw new Error('Cache.add requires success'); await this.put(value, response); }
        async match(value, { ignoreSearch = false } = {}) {
            const wanted = urlOf(value);
            for (const [key, record] of this.items) {
                const actual = new URL(key);
                if (ignoreSearch ? actual.origin === wanted.origin && actual.pathname === wanted.pathname : key === wanted.href) {
                    return new Response(record.body.slice(), { status: record.status, headers: record.headers });
                }
            }
        }
        async delete(value) { return this.items.delete(urlOf(value).href); }
    }
    const caches = {
        async open(name) { if (!buckets.has(name)) buckets.set(name, new MemoryCache()); return buckets.get(name); },
        async keys() { return [...buckets.keys()]; }, async delete(name) { return buckets.delete(name); },
        async match(value) { for (const cache of buckets.values()) { const result = await cache.match(value); if (result) return result; } },
    };
    const context = vm.createContext({
        self: { location: { origin }, addEventListener: (name, callback) => handlers.set(name, callback), skipWaiting() {}, clients: { claim() {} } },
        caches, URL, Response, Promise, fetch: network,
    });
    vm.runInContext(readFileSync(resolve(root, 'sw.js'), 'utf8'), context);
    async function lifecycle(name) { const pending = []; handlers.get(name)({ waitUntil: promise => pending.push(promise) }); await Promise.all(pending); }
    async function request(value, mode = 'cors') {
        let response; const pending = [];
        handlers.get('fetch')({ request: { url: urlOf(value).href, method: 'GET', mode }, respondWith: promise => { response = promise; }, waitUntil: promise => pending.push(promise) });
        const result = await response; await Promise.all(pending); return result;
    }

    // First launch loads modules BEFORE SW registration. Only install's own
    // precache can satisfy the first offline reload; no prior fetches seed it.
    const old = await caches.open('okchu-regression-old'); await old.put('/old', new Response('old'));
    await lifecycle('install'); await lifecycle('activate');
    assert.equal(buckets.has('okchu-regression-old'), false, 'Activate must remove the old app cache');
    online = false;
    let checks = 1;
    for (const navigation of ['/', '/?kontrol=1', '/index.html?kontrol=1', '/offline/deep-link?kontrol=1']) {
        const result = await request(navigation, 'navigate');
        assert.equal(result.status, 200, navigation); assert.equal(await result.text(), html, navigation); checks++;
    }
    async function offlineGraph() {
        const modules = new Map();
        async function get(url) {
            if (!modules.has(url.href)) modules.set(url.href, (async () => {
                const response = await request(url.href);
                assert.ok(response?.ok, `Offline boot dependency unavailable: ${url.pathname}`);
                const code = await response.text();
                assert.ok(code === bytesAt(url.href).toString(), `Stale offline dependency: ${url.pathname}`);
                return new vm.SourceTextModule(code, { identifier: url.href });
            })());
            return modules.get(url.href);
        }
        for (const script of scripts) {
            const entry = await get(new URL(script.src, origin + '/'));
            await entry.link((specifier, parent) => get(new URL(specifier, parent.identifier)));
        }
        return modules.size;
    }
    const moduleCount = await offlineGraph();
    assert.equal(moduleCount, onlineModules.size, 'Every real static dependency must link offline'); checks += moduleCount;

    const languages = [...new Set([...html.matchAll(/\bdata-lang=["']([^"']+)["']/g)].map(match => match[1]))];
    assert.equal(languages.length, 5);
    for (const language of languages) {
        const response = await request(`/lang/${language}.json?v=offline-regression`);
        assert.ok(response.ok, language); assert.deepEqual(await response.json(), JSON.parse(bytesAt(`/lang/${language}.json`))); checks++;
    }
    const { chapters } = await import('../js/data/chapters.js');
    const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
    const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)].filter(([tag]) => /\brel=["']stylesheet["']/.test(tag)).map(([tag]) => tag.match(/\bhref=["']([^"']+)["']/)[1]);
    const cssAssets = stylesheets.flatMap(stylesheet => [...bytesAt(stylesheet).toString().matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)].map(match => new URL(match[1], urlOf(stylesheet)).href));
    const assets = new Set([
        ...chapters.map(chapter => chapter.artwork?.image || chapter.backgroundImage).filter(Boolean),
        ...manifest.icons.map(icon => icon.src),
        ...[...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/g)].map(match => match[1]),
        ...stylesheets, ...cssAssets,
    ].map(asset => urlOf(asset).href));
    for (const asset of assets) {
        const response = await request(asset); assert.ok(response.ok, asset);
        assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array(bytesAt(asset))); checks++;
    }

    // Fault injection proves the former omitted imports really abort boot;
    // the regression would not pass merely because index/main are cached.
    const current = await caches.open(vm.runInContext('CACHE_NAME', context));
    for (const pathname of ['/js/pwa-install.js', '/js/rate-us.js', '/js/ads.js', '/js/iap.js']) {
        const key = urlOf(pathname).href, saved = current.items.get(key);
        assert.ok(saved, pathname); assert.equal(await current.delete(pathname), true);
        await assert.rejects(offlineGraph, error => error.message.includes(`Offline boot dependency unavailable: ${pathname}`));
        current.items.set(key, saved); checks++;
    }
    const unavailable = await request('/js/not-a-real-module.js'); assert.equal(unavailable.type, 'error'); checks++;

    // Real code requests are network first and refresh that versioned cache.
    online = true;
    const entryUrl = new URL(scripts[0].src, origin + '/');
    const updated = bytesAt(entryUrl.href).toString() + '\n// SW network-first regression marker\n';
    overrides.set(entryUrl.pathname, updated);
    assert.ok(await (await request(entryUrl.href)).text() === updated, 'Online boot code must use the current network response'); checks++;
    online = false;
    assert.ok(await (await request(entryUrl.href)).text() === updated, 'Offline boot must prefer the refreshed exact version over the older unversioned precache'); checks++;
    console.log(JSON.stringify({ passed: checks, bootModules: moduleCount, languages: languages.length, artworkIconsStylesheetsAndCssAssets: assets.size, omittedImportRegressions: 4, scope: 'Actual SW install/activate/fetch and ES module graph; in-memory Cache Storage/network, without browser or native-device execution' }));
}
