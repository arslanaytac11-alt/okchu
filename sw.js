// Bump APP_VERSION on every deploy — the cache name derives from it so clients
// pick up new assets and old caches are cleaned up on activate.
const APP_VERSION = '17';
const CACHE_NAME = `okchu-v${APP_VERSION}`;

const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/game.js',
    '/js/renderer.js',
    '/js/arrow.js',
    '/js/grid.js',
    '/js/screens.js',
    '/js/storage.js',
    '/js/levels.js',
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
    '/assets/icons/icon-192.png',
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

// Stale-while-revalidate for GETs: serve cache instantly, refresh in background.
// This means users get new content on the SECOND visit after a deploy — bump
// APP_VERSION above to force immediate eviction for critical releases.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkPromise = fetch(event.request).then((response) => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached || caches.match('/index.html'));
            return cached || networkPromise;
        })
    );
});
