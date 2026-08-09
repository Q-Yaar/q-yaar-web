self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push event received:', data);
      
      const title = data.title || 'New Notification';
      const options = {
        body: data.message || data.body || '',
        icon: '/logo192.png', // Assuming CRA default logo exists
        badge: '/logo192.png',
        data: {
          url: data.url || '/',
        }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('Error parsing push data', e);
      // Fallback if data is not JSON
      event.waitUntil(
        self.registration.showNotification('New Notification', {
          body: event.data.text(),
          icon: '/logo192.png',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
