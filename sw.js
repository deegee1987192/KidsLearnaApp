// KidsLearn service worker.
// Network-first for the site (so game updates show up right away), falling back
// to the cache when offline. /api/ requests always go to the network, never cached.
// Bump CACHE when the precache list changes.
const CACHE = 'kidslearn-v3';

const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'css/base.css',
  'js/core/util.js',
  'js/core/scene.js',
  'js/core/wiz.js',
  'js/core/confetti.js',
  'js/core/audio.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'homework/index.html',
  'homework/homework.css',
  'homework/js/hw-util.js',
  'homework/js/db.js',
  'homework/js/speech.js',
  'homework/js/pets.js',
  'homework/js/map.js',
  'homework/js/visuals.js',
  'homework/js/fallback-missions.js',
  'homework/js/missions.js',
  'homework/js/screens.js',
  'homework/js/app.js',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // One missing file shouldn't stop the worker installing.
      .then(cache => Promise.all(PRECACHE.map(u => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never serve the API from cache.
  if(url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Google Fonts: cache-first (they never change).
  if(FONT_HOSTS.includes(url.hostname)){
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if(url.origin !== self.location.origin) return;

  // Same-origin: network first, cache as fallback.
  event.respondWith(
    fetch(req).then(res => {
      if(res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(hit =>
        hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())
      )
    )
  );
});
