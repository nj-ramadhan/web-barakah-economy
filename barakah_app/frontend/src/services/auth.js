import axios from 'axios';
import api from './api';

const API_URL = `${process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud'}/api/auth/`;

// Utility function to get the CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Get the CSRF token
const csrfToken = getCookie('csrftoken');

// Axios instance with default headers
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken, // Include CSRF token in headers
  },
});

// Add 401 interceptor to axiosInstance as well
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.includes('login')) {
      const user = localStorage.getItem('user');
      if (user) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        localStorage.removeItem('user');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

const googleLogin = (token) => {
  return axiosInstance.post('google-login/', {
    token,
  }).then((response) => {
    if (response.data.access) {
      localStorage.setItem('user', JSON.stringify({
        access: response.data.access,
        refresh: response.data.refresh,
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        picture: response.data.picture,
        is_verified_member: response.data.is_verified_member,
        accessible_menus: response.data.accessible_menus,
        is_profile_complete: response.data.is_profile_complete,
      }));
    }
    return response.data;
  }).catch((error) => {
    console.error('Google login error:', error);
    throw error;
  });
};

const register = (username, email, password, name_full = '', phone = '') => {
  return axiosInstance.post('register/', {
    username,
    email,
    password,
    name_full,
    phone,
  });
};

const login = (username, password) => {
  return axiosInstance.post('login/', {
    username,
    password,
  }).then((response) => {
    if (response.data.access) {
      localStorage.setItem('user', JSON.stringify({
        access: response.data.access,
        refresh: response.data.refresh,
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        picture: response.data.picture,
        is_profile_complete: response.data.is_profile_complete,
      }));
    }
    return response.data;
  });
};

const logout = () => {
  localStorage.removeItem('user');
};

const getProfile = async (userId) => {
  try {
    const response = await api.get(`/profiles/${userId}/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
};

const updateProfile = async (userId, profileData) => {
  try {
    const response = await api.patch(`/profiles/${userId}/`, profileData);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

const authService = {
  googleLogin,
  register,
  login,
  logout,
  getProfile,
  updateProfile,
};

export default authService;