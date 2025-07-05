// A more robust "network-first" service worker
const CACHE_NAME = 'rentpilot-network-first-v2';
const OFFLINE_URL = '/offline';
const ASSETS_TO_CACHE = [
  OFFLINE_URL
];

// Install: Cache the offline page and other essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(ASSETS_TO_CACHE);
      } catch (error) {
        console.error('Failed to cache assets during install:', error);
      }
    })()
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })()
  );
  self.clients.claim();
});

// Fetch: Try network, fall back to cache for navigation
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }
          return await fetch(event.request);
        } catch (error) {
          console.log('Fetch failed; returning offline page instead.', error);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  }
  // For non-navigation requests (CSS, JS, images), we can add a stale-while-revalidate strategy later if needed.
  // For now, we let them pass through to the network to ensure freshness.
});
