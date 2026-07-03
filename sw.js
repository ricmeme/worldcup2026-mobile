const CACHE = 'worldcup2026-mobile-v5';

// Cachear sólo archivos críticos que existen con seguridad en el repo.
// No cacheamos banderas PNG porque la app móvil usa emojis robustos como banderas;
// si un PNG falta, cache.addAll() rechaza toda la instalación del service worker.
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './mobile-fixes.js',
  './manifest.webmanifest',
  './favicon.png',
  './data/schedule.json',
  './data/worldcup2026_schedule_clt.csv',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ESPN debe ir a red primero para marcadores en vivo.
  if (url.hostname.includes('espn.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
