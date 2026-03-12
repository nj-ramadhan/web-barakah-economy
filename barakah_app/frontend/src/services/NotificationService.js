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

    showNotification: (title, options = {}) => {
        if (Notification.permission === 'granted') {
            const defaultOptions = {
                icon: '/logo192.png',
                badge: '/logo192.png',
                silent: false,
                ...options
            };

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
        }
        return null;
    }
};

export default NotificationService;
