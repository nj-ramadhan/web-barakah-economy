import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api;
