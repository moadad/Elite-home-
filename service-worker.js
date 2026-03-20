const APP_VERSION = "elitehome-production-ultra-v11";
const STATIC_CACHE = `${APP_VERSION}-static`;
const RUNTIME_CACHE = `${APP_VERSION}-runtime`;
const STATIC_ASSETS = [
  './','./index.html','./product.html','./styles.css','./app.js','./product-page.js','./manifest.webmanifest',
  './assets/logo-mark.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/maskable-512.png'
];
const APP_SHELL_URL = new URL('./index.html', self.location.href).href;
const ROOT_URL = new URL('./', self.location.href).href;
const OFFLINE_HTML = `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Home Ware</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#f7f7f7;color:#1f2937;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}main{max-width:560px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}h1{margin:0 0 10px;font-size:22px}p{margin:8px 0;line-height:1.8}</style></head><body><main><h1>تعذر تحميل الصفحة مؤقتًا</h1><p>يبدو أن الاتصال بالشبكة غير متاح الآن أو أن نسخة التخزين المؤقت قديمة.</p><p>أعد تحميل الصفحة مرة أخرى بعد الاتصال بالإنترنت.</p></main></body></html>`;

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

async function matchAppShell() {
  return (
    (await caches.match(APP_SHELL_URL, { ignoreSearch: true })) ||
    (await caches.match(ROOT_URL, { ignoreSearch: true })) ||
    (await caches.match('./index.html', { ignoreSearch: true })) ||
    (await caches.match('./', { ignoreSearch: true })) ||
    null
  );
}

async function safePut(cacheName, request, response) {
  if (!response) return;
  if (response.type === 'error') return;
  if (response.status === 206) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone()).catch(() => {});
}

function buildFallbackResponse(status = 503, message = 'Offline') {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!isCacheable(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        await safePut(RUNTIME_CACHE, request, fresh);
        return fresh;
      } catch {
        return (
          (await caches.match(request, { ignoreSearch: true })) ||
          (await matchAppShell()) ||
          new Response(OFFLINE_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          })
        );
      }
    })());
    return;
  }

  const isStatic = STATIC_ASSETS.some((asset) => url.pathname.endsWith(asset.replace('./', '/')) || url.pathname === asset.replace('./', '/'));
  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      try {
        const response = await fetch(request);
        await safePut(STATIC_CACHE, request, response);
        return response;
      } catch {
        return cached || buildFallbackResponse(504, 'Static asset unavailable');
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      await safePut(RUNTIME_CACHE, request, response);
      return response;
    } catch {
      return cached || buildFallbackResponse(504, 'Request unavailable');
    }
  })());
});
