/**
 * utils/captchaUtils.js
 * Lightweight Invisible Turnstile CAPTCHA Handler
 * Completely invisible to users, zero puzzles, instant background verification.
 * Built with full Fail-Safe: If network/adblocker blocks the script or in APK,
 * it resolves gracefully without blocking login.
 */

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

let isScriptLoading = false;
let isScriptLoaded = false;

const loadTurnstileScript = () => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve(false);
        if (window.turnstile) {
            isScriptLoaded = true;
            return resolve(true);
        }
        if (isScriptLoaded) return resolve(true);

        if (isScriptLoading) {
            const checkInterval = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(checkInterval);
                    isScriptLoaded = true;
                    resolve(true);
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(false);
            }, 2500);
            return;
        }

        isScriptLoading = true;
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            isScriptLoaded = true;
            isScriptLoading = false;
            resolve(true);
        };
        script.onerror = () => {
            isScriptLoading = false;
            resolve(false);
        };
        document.head.appendChild(script);

        // Fail-safe timeout
        setTimeout(() => {
            if (!isScriptLoaded) resolve(false);
        }, 2000);
    });
};

export const getInvisibleCaptchaToken = async (containerId = 'invisible-turnstile-container') => {
    try {
        const loaded = await loadTurnstileScript();
        if (!loaded || !window.turnstile) {
            return null; // Fail-safe mode (user is not blocked)
        }

        return new Promise((resolve) => {
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.display = 'none';
                document.body.appendChild(container);
            }

            try {
                const widgetId = window.turnstile.render(container, {
                    sitekey: TURNSTILE_SITE_KEY,
                    size: 'invisible',
                    callback: (token) => {
                        try { window.turnstile.remove(widgetId); } catch (e) {}
                        resolve(token);
                    },
                    'error-callback': () => {
                        try { window.turnstile.remove(widgetId); } catch (e) {}
                        resolve(null); // Fail-safe
                    },
                    'expired-callback': () => {
                        resolve(null);
                    }
                });

                // Fail-safe: if Turnstile takes > 1500ms, proceed anyway
                setTimeout(() => {
                    resolve(null);
                }, 1500);
            } catch (renderError) {
                resolve(null);
            }
        });
    } catch (e) {
        return null;
    }
};
