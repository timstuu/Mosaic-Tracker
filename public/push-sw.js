/* global self, clients */
// Push handler for Mosaic reminders. Imported into the Workbox-generated service
// worker via vite-plugin-pwa's `workbox.importScripts`. Kept as plain JS so it
// works regardless of the build strategy and never touches precaching.

const APP_URL = '/Mosaic-Tracker/';

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data && event.data.text ? event.data.text() : '' };
  }

  const title = payload.title || 'Mosaic Reminder';
  const options = {
    body: payload.body || 'You have a reminder.',
    icon: payload.icon || './icons/icon-192.png',
    badge: payload.badge || './icons/favicon-32x32.png',
    tag: payload.tag || 'mosaic-reminder',
    data: { url: payload.url || APP_URL },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || APP_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(APP_URL) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
