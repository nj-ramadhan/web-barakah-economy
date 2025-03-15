import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api/auth/`;

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

const googleLogin = (token) => {
  return axiosInstance.post('google-login/', {
    token,
  }).then((response) => {
    if (response.data.access) {
      localStorage.setItem('user', JSON.stringify({
        access: response.data.access,
        refresh: response.data.refresh,
        id: response.data.id, // Ensure this is included in the backend response
        username: response.data.username, // Optional, but useful
        email: response.data.email, // Optional, but useful
      }));
    }
    return response.data;
  }).catch((error) => {
    console.error('Google login error:', error);
    throw error;
  });
};

const register = (username, email, password) => {
  return axiosInstance.post('register/', {
    username,
    email,
    password,
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
        id: response.data.id, // Ensure this is included in the backend response
        username: response.data.username, // Optional, but useful
        email: response.data.email, // Optional, but useful
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
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.access; // Use the access token

    const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/${userId}/`, {
      headers: {
        Authorization: `Bearer ${token}`, // Include the token in the request headers
        'X-CSRFToken': csrfToken, // Include CSRF token for POST/PUT/DELETE requests
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
};

const updateProfile = async (userId, profileData) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.access;

    const response = await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/${userId}/`, profileData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-CSRFToken': csrfToken, // Include CSRF token for POST/PUT/DELETE requests
      },
    });
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