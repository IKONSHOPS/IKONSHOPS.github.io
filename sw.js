/* ============================================================
   IKON SHOPS — Service Worker (PWA Offline Support)
   ============================================================ */

const CACHE_NAME = 'ikon-shops-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/products.js',
  '/js/store.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/hoodie_cyberpunk.jpg',
  '/images/jersey_argentina.jpg',
  '/images/jersey_realmadrid.jpg',
  '/images/jersey_barcelona.jpg',
  '/images/kurta_block.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});
