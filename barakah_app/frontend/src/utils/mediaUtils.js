/**
 * Resolves a media URL by prepending the API base URL if needed.
 * Handles fallbacks gracefully for different environments (local vs production).
 */
export const getMediaUrl = (url) => {
    if (!url) return '';
    
    // Handle blob and data URLs (usually for previews before upload)
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    
    // Resolve base URL
    // Priority: 
    // 1. process.env.REACT_APP_API_BASE_URL (if defined)
    // 2. window.location.origin (dynamic fallback for VPS/IP access)
    const baseUrl = process.env.REACT_APP_API_BASE_URL || window.location.origin;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // If it's already an absolute URL
    if (url.startsWith('http')) {
        try {
            const urlObj = new URL(url);
            // If the URL points to localhost or an IP but we are on a domain (or vice versa),
            // we might need to force it to use our cleanBase.
            // This happens when the backend returns absolute URLs based on its own config.
            const legacyHosts = ['localhost', '127.0.0.1', 'api.barakah.cloud'];
            const isLegacy = legacyHosts.includes(urlObj.hostname) || /^(\d{1,3}\.){3}\d{1,3}$/.test(urlObj.hostname);
            
            if (isLegacy) {
                return `${cleanBase}${urlObj.pathname}${urlObj.search}`;
            }
        } catch (e) { 
            return url; 
        }
        return url;
    }

    // Relative URLs
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${cleanBase}${cleanUrl}`;
};
