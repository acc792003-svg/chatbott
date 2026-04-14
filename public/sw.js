self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Bắt buộc có fetch handler để được tính là Installable PWA
  event.respondWith(fetch(event.request));
});
