const NotificationService = {
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    showNotification: async (title, options = {}) => {
        // Handle android builders or webviews offering a native bridge
        if (window.Android && typeof window.Android.showNotification === 'function') {
            window.Android.showNotification(title, options.body || '');
            return null;
        }

        if (!('Notification' in window)) {
            return null;
        }

        if (Notification.permission === 'granted') {
            const defaultOptions = {
                icon: '/logo192.png',
                badge: '/logo192.png',
                silent: false,
                ...options
            };

            // First try Service Worker implementation which works on Mobile Chrome
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration) {
                        const swOptions = {
                            ...defaultOptions,
                            data: { url: options.url || window.location.href, ...options.data }
                        };
                        await registration.showNotification(title, swOptions);
                        return null;
                    }
                } catch (e) {
                    console.error("Error using service worker for notification:", e);
                }
            }

            // Fallback for Desktop where new Notification() constructor is allowed
            try {
                const notification = new Notification(title, defaultOptions);

                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    if (options.url) {
                        window.location.href = options.url;
                    }
                    notification.close();
                };

                return notification;
            } catch (err) {
                // The old "Illegal constructor" error implies we're on mobile and SW isn't ready
                console.error("Failed to show notification natively:", err);
            }
        }
        return null;
    }
};

export default NotificationService;
