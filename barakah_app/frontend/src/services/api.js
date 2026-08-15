import axios from 'axios';
import { safeStorage } from '../utils/storageUtils';

const API_URL = `${process.env.REACT_APP_API_BASE_URL || window.location.origin}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    try {
      const user = safeStorage.getUser();
      const token = user?.access;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error retrieving user auth token", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and not already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const user = safeStorage.getUser();
        if (user && user.refresh) {
          // Attempt to refresh the access token
          const baseUrl = process.env.REACT_APP_API_BASE_URL || window.location.origin;
          const refreshResponse = await axios.post(`${baseUrl}/api/auth/token/refresh/`, {
            refresh: user.refresh
          });
          
          const newAccess = refreshResponse.data.access;
          
          // Update user in safeStorage
          user.access = newAccess;
          safeStorage.setUser(user);
          
          // Update the header and retry the original request
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token is also expired or invalid
        console.error("Token refresh failed", refreshError);
        
        const user = safeStorage.getUser();
        if (user) {
          // Only clear and reload if we're not on a page that allows guest access
          safeStorage.removeItem('user');
          
          if (!window.location.pathname.includes('/live-meet-test')) {
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
              window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            } else {
              window.location.reload();
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

