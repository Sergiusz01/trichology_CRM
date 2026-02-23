self.addEventListener('push', function (event) {
    if (event.data) {
        let data = {};
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Nowe powiadomienie', body: event.data.text() };
        }

        const options = {
            body: data.body || 'Masz nowe powiadomienie z systemu Trychologia CRM',
            icon: '/vite.svg',
            badge: '/vite.svg',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url || '/'
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Otwórz aplikację'
                },
                {
                    action: 'close',
                    title: 'Zamknij'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Trychologia CRM', options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action !== 'close') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
                const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});
