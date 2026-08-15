/**
 * Safari Private Browsing & Cross-Browser Safe Storage Utilities
 * Prevents QuotaExceededError or SecurityError crashes in restricted environments.
 */

// In-memory fallback if localStorage is unavailable or blocked by Safari ITP
const memoryStorage = {};

export const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Could not read ${key} from localStorage:`, e);
    }
    return memoryStorage[key] || null;
  },

  setItem: (key, value) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    memoryStorage[key] = stringValue;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringValue);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Could not write ${key} to localStorage:`, e);
    }
  },

  removeItem: (key) => {
    delete memoryStorage[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Could not remove ${key} from localStorage:`, e);
    }
  },

  /**
   * Helper to retrieve and parse current logged-in user
   */
  getUser: () => {
    try {
      const raw = safeStorage.getItem('user');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error('[SafeStorage] Error parsing user object:', e);
      return null;
    }
  },

  /**
   * Helper to save updated user object
   */
  setUser: (userData) => {
    try {
      safeStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.error('[SafeStorage] Error saving user object:', e);
    }
  }
};
