/* ElectroSim service worker – offline support.
   Network-first (so updates show immediately when online), cache fallback when offline.
   Bump CACHE when you want to force-clear old files. */
const CACHE = 'electrosim-v1';
const ASSETS = [
  './', './index.html', './simulator.html', './manifest.webmanifest',
  './css/theme.css', './css/site.css', './css/app.css',
  './js/parts.js', './js/app.js', './js/landing.js', './js/pwa.js',
  './vendor/jspdf.umd.min.js', './fonts/plus-jakarta-sans-latin-wght-normal.woff2',
  './assets/hero.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png', './assets/icons/favicon-32.png', './assets/icons/icon.svg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./simulator.html') : Response.error())))
  );
});
