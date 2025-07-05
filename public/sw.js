const CACHE_NAME = 'rentpilot-cache-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add all URLs to cache, but don't fail the install if one of them fails
        // This is safer as some URLs might not be available during install
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(reason => {
                console.log(`Failed to cache ${urlToCache}: ${reason}`);
            });
        });
        return Promise.all(cachePromises);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
      return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          // Fetch the latest version from the network in the background
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }).catch(() => {
             // Network failed, do nothing, we already served from cache
          });
          return response;
        }

        // Not in cache, go to network
        return fetch(event.request).catch(() => {
          // If fetch fails (e.g., user is offline), return the offline page.
          return caches.match('/offline');
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
