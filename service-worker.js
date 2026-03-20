const APP_VERSION = "elitehome-production-ultra-v7";
const STATIC_CACHE = `${APP_VERSION}-static`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const STATIC_ASSETS = [
  './','./index.html','./product.html','./styles.css','./app.js','./product-page.js','./manifest.webmanifest',
  './assets/logo-mark.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isCacheable(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.endsWith('/__/firebase/init.js')) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!isCacheable(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  const isStatic = STATIC_ASSETS.some((asset) => url.pathname.endsWith(asset.replace('./', '/')) || url.pathname === asset.replace('./', '/'));
  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request).then(async (response) => {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});
