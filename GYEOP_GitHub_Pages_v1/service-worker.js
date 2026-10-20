const CACHE_NAME = 'gyeop-static-v1';
const BASE = self.registration.scope;
const FILES = ['','index.html','styles.css','logic.js','app.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png'].map(path => new URL(path, BASE).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gyeop-static-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== new URL(BASE).origin) return;
  if (url.pathname.startsWith(new URL(BASE).pathname) === false) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok && response.type === 'basic') {
      const cloned=response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(req,cloned)).catch(()=>{}));
    }
    return response;
  }).catch(() => caches.match(req).then(hit=>hit || caches.match(new URL('index.html', BASE).href))));
});
