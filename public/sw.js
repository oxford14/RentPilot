
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    self.registration.unregister()
      .then(() => {
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach(client => {
            if (client.url && 'navigate' in client) {
                client.navigate(client.url);
            }
        });
      })
  );
});
