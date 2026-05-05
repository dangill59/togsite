const CACHE_NAME = 'tog-v2';
const ASSETS = [
  '/',
  '/about',
  '/music',
  '/tunes',
  '/shows',
  '/fanclub',
  '/contact',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Only handle GETs — POST/PUT/DELETE can't be cached and shouldn't be
  // intercepted (the Cache API throws on non-GET).
  if (req.method !== 'GET') return;

  // Skip API routes — they're dynamic; caching breaks fresh data + auth.
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin (e.g., Vercel Blob URLs, Resend, etc.)
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only cache successful basic responses
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
