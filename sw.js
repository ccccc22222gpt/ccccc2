/* Roma Nostra · funcionamiento sin conexión.
   Precarga la app completa; el tiempo va primero a la red; las teselas del mapa se guardan según se ven. */
const V = 'rn-v3';
const SHELL = ['./', 'index.html', 'bolsillo.html', 'css/app.css', 'js/data.js', 'js/art.js', 'js/app.js', 'vendor/maplibre-gl.js', 'vendor/maplibre-gl.css',
  'fonts/fraunces-latin-wght-normal.woff2', 'fonts/fraunces-latin-wght-italic.woff2', 'fonts/instrument-sans-latin-wght-normal.woff2',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'exports/roma-nostra.kml', 'exports/roma-nostra.csv', 'exports/roma-nostra-sabado.gpx', 'exports/roma-nostra-domingo.gpx', 'exports/roma-nostra-lunes.gpx', 'exports/roma-nostra-bolsillo.pdf'];
const TILES = 'rn-tiles-v1', TILE_MAX = 600;

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

async function trim(cache) { const keys = await cache.keys(); if (keys.length > TILE_MAX) await Promise.all(keys.slice(0, keys.length - TILE_MAX).map(k => cache.delete(k))); }

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    /* app: red primero para recibir correcciones, caché si no hay red */
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  if (url.hostname.endsWith('openfreemap.org')) {
    /* mapa: caché primero */
    e.respondWith(caches.open(TILES).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { c.put(req, r.clone()); trim(c); } return r; }))));
  }
});
