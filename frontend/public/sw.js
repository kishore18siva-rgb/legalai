const CACHE_NAME = 'legallens-cache-v2';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 1. Bypass non-GET requests (e.g., API POST/PUT requests)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Bypass API requests to prevent caching stale data
  if (event.request.url.includes('/api/')) {
    return;
  }

  // 3. Network first strategy for navigation requests (HTML)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback to the SPA shell (index.html) if offline or blocked
        return caches.match('/index.html');
      })
    );
    return;
  }
  
  // 4. Cache first strategy for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch((error) => {
      // Gracefully handle fetch failures (e.g., adblocker ERR_BLOCKED_BY_CLIENT)
      console.warn('Fetch failed in Service Worker:', event.request.url, error);
      return new Response('Network error or blocked by client.', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
