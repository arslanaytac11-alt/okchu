const CACHE_NAME = 'ok-bulmacasi-v1';
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
    '/assets/menu-bg.png',
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
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => caches.match('/index.html'))
    );
});
