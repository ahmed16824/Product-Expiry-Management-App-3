// sw.js

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // Add a call to skipWaiting here to ensure the new service worker activates quickly.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

// The service worker is not handling fetch events to keep it simple and avoid caching issues for now.
// It's primarily here for notifications.

self.addEventListener('notificationclick', event => {
  // For now, just close the notification.
  // In a real app, you'd likely want to open the app or a specific page.
  event.notification.close();

  // This looks for an existing window and focuses it.
  event.waitUntil(clients.matchAll({
    type: 'window'
  }).then(clientList => {
    for (const client of clientList) {
      if (client.url === '/' && 'focus' in client)
        return client.focus();
    }
    if (clients.openWindow)
      return clients.openWindow('/');
  }));
});
