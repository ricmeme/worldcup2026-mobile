const CACHE = 'worldcup2026-mobile-v11';
const ASSETS = [
  './data/schedule.json',
  './data/worldcup2026_schedule_clt.csv',
  './manifest.webmanifest',
  './favicon.png',
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
const NETWORK_FIRST = ['/', '/index.html', '/styles.css', '/app.js', '/mobile-fixes.js', '/mobile-notifications.js', '/mobile-voice-male.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key === CACHE ? null : caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('espn.com')) return;
  if (event.request.mode === 'navigate' || NETWORK_FIRST.includes(url.pathname)) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
