import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = user?.access;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
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
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.refresh) {
            // Attempt to refresh the access token
            const refreshResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/token/refresh/`, {
              refresh: user.refresh
            });
            
            const newAccess = refreshResponse.data.access;
            
            // Update user in localStorage
            user.access = newAccess;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update the header and retry the original request
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh token is also expired or invalid
        console.error("Token refresh failed", refreshError);
        
        const user = localStorage.getItem('user');
        if (user) {
          // Only clear and reload if we're not on a page that allows guest access (like Meet)
          // Or if we want to stay logged in as a guest, we just remove the 'user'
          localStorage.removeItem('user');
          
          // Don't interrupt the meeting if refresh fails
          if (!window.location.pathname.includes('/live-meet-test')) {
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            window.location.reload();
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
