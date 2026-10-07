// Bump APP_VERSION on every deploy — the cache name derives from it so clients
// pick up new assets and old caches are cleaned up on activate.
const APP_VERSION = '40';
const CACHE_NAME = `okchu-v${APP_VERSION}`;

const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/redesign.css',
    '/css/tutorial-demo.css',
    '/js/dialog-focus.js',
    '/js/launch-scheduler.js',
    '/js/main.js',
    '/js/preview-mode.js',
    '/js/pwa-install.js',
    '/js/rate-us.js',
    '/js/ads.js',
    '/js/iap.js',
    '/js/game.js',
    '/js/hit-test.js',
    '/js/egypt-story.js',
    '/js/renderer.js',
    '/js/arrow.js',
    '/js/arrow-motion.js',
    '/js/board-outline.js',
    '/js/grid.js',
    '/js/rune-order.js',
    '/js/rune-hud.js',
    '/js/screens.js',
    '/js/storage.js',
    '/js/levels.js',
    '/js/balance.js',
    '/js/puzzle-catalog.js',
    '/js/particles.js',
    '/js/themes.js',
    '/js/lives.js',
    '/js/hints.js',
    '/js/i18n.js',
    '/js/daily.js',
    '/js/achievements.js',
    '/js/tutorial.js',
    '/js/easing.js',
    '/js/menu-bg.js',
    '/js/sound.js',
    '/js/haptics.js',
    '/js/level-validator.js',
    '/js/data/chapters.js',
    '/js/data/levels/egypt.js',
    '/js/data/levels/greek.js',
    '/js/data/levels/rome.js',
    '/js/data/levels/viking.js',
    '/js/data/levels/ottoman.js',
    '/js/data/levels/china.js',
    '/js/data/levels/maya.js',
    '/js/data/levels/india.js',
    '/js/data/levels/medieval.js',
    '/js/data/levels/final.js',
    '/lang/tr.json',
    '/lang/en.json',
    '/lang/es.json',
    '/lang/fr.json',
    '/lang/ja.json',
    '/assets/menu-bg.png',
    '/assets/characters/explorer-v1.png',
    '/assets/icons/icon-192-expedition.png',
    '/assets/icons/icon-512-expedition.png',
    '/assets/backgrounds/expedition-egypt.png',
    '/assets/backgrounds/expedition-greek.png',
    '/assets/backgrounds/expedition-rome.png',
    '/assets/backgrounds/expedition-viking.png',
    '/assets/backgrounds/expedition-ottoman.png',
    '/assets/backgrounds/expedition-china.png',
    '/assets/backgrounds/expedition-maya.png',
    '/assets/backgrounds/expedition-india.png',
    '/assets/backgrounds/expedition-medieval.png',
    '/assets/backgrounds/expedition-final.png',
    '/assets/backgrounds/bg-egypt.jpg',
    '/assets/backgrounds/bg-greek.jpg',
    '/assets/backgrounds/bg-rome.jpg',
    '/assets/backgrounds/bg-viking.jpg',
    '/assets/backgrounds/bg-ottoman.jpg',
    '/assets/backgrounds/bg-china.jpg',
    '/assets/backgrounds/bg-maya.jpg',
    '/assets/backgrounds/bg-india.jpg',
    '/assets/backgrounds/bg-medieval.jpg',
    '/assets/backgrounds/bg-final.jpg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        // Individually cache assets so one 404 (e.g. removed file) doesn't abort the whole install.
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(ASSETS.map((url) =>
                cache.add(url).catch(() => { /* skip missing asset */ })
            ))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Code and copy are network-first so a release cannot mix old input code
// with the new UI. Native Capacitor does not register this worker.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    const code = event.request.mode === 'navigate' || /\.(?:html|js|css|json)$/.test(url.pathname);
    const cached = () => caches.open(CACHE_NAME).then(async cache =>
        (await cache.match(event.request)) || cache.match(event.request, {ignoreSearch: true}));
    const network = () => fetch(event.request).then(response => {
        if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
    });
    const offline = async () => (await cached()) || (event.request.mode === 'navigate'
        ? await caches.match('/index.html') : Response.error());
    event.respondWith(code ? network().catch(offline) : cached().then(hit => hit || network().catch(offline)));
});
