import axios from 'axios';
import api from './api';
import { safeStorage } from '../utils/storageUtils';
import { detectDeviceDetails } from '../utils/deviceUtils';

const API_URL = `${process.env.REACT_APP_API_BASE_URL || window.location.origin}/api/auth/`;


// Utility function to get the CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (typeof document !== 'undefined' && document.cookie && document.cookie !== '') {
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
    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
  },
});

// Add 401 interceptor to axiosInstance as well
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.includes('login')) {
      const user = safeStorage.getUser();
      if (user) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        safeStorage.removeItem('user');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

const googleLogin = (token, kickDeviceId = null) => {
  const dev = detectDeviceDetails();
  return axiosInstance.post('google-login/', {
    token,
    device_id: dev.deviceId,
    device_name: dev.deviceName,
    device_type: dev.deviceType,
    kick_device_id: kickDeviceId,
  }).then((response) => {
    return response.data;
  }).catch((error) => {
    console.error('Google login error:', error?.response?.data || error.message);
    throw error;
  });
};

const register = (username, email, password, name_full = '', phone = '', captchaToken = null) => {
  return axiosInstance.post('register/', {
    username,
    email,
    password,
    name_full,
    phone,
    captcha_token: captchaToken,
  });
};

const login = (username, password, kickDeviceId = null, captchaToken = null) => {
  const dev = detectDeviceDetails();
  return axiosInstance.post('login/', {
    username,
    password,
    device_id: dev.deviceId,
    device_name: dev.deviceName,
    device_type: dev.deviceType,
    kick_device_id: kickDeviceId,
    captcha_token: captchaToken,
  }).then((response) => {
    return response.data;
  });
};


const getActiveDevices = async () => {
  try {
    const response = await api.get('/auth/active-devices/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch active devices:', error);
    throw error;
  }
};

const kickDevice = async (deviceId) => {
  try {
    const response = await api.delete('/auth/active-devices/', {
      data: { device_id: deviceId }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to kick device:', error);
    throw error;
  }
};

const acceptAgreement = async () => {
  try {
    const response = await api.post('/auth/accept-agreement/');
    const user = safeStorage.getUser();
    if (user) {
      user.user_agreement_accepted = true;
      safeStorage.setUser(user);
    }
    return response.data;
  } catch (error) {
    console.error('Failed to accept agreement:', error);
    throw error;
  }
};

const logout = () => {
  safeStorage.removeItem('user');
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
  acceptAgreement,
  getActiveDevices,
  kickDevice,
};

export default authService;
