
const CACHE_NAME = 'rentpilot-cache-v2'; // Updated cache version
const OFFLINE_URL = '/offline';

// On install, cache the offline page.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// On activate, clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients as soon as the service worker activates.
  self.clients.claim();
});

// On fetch, implement a network-first strategy for navigation.
self.addEventListener('fetch', (event) => {
  // We only want to intercept navigation requests, not API calls or images.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported.
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Always try the network first.
          const networkResponse = await fetch(event.request);
          
          // If we get a valid response, put it in the cache for future offline use.
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // The network failed.
          console.log('Fetch failed; returning offline page instead.', error);

          const cache = await caches.open(CACHE_NAME);
          
          // Try to serve the page from the cache if it was previously visited.
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
              return cachedResponse;
          }
          
          // If not in cache, serve the generic offline page.
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage;
        }
      })()
    );
  }
});
