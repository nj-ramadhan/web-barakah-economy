import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api/auth/`;

const googleLogin = (token) => {
    return axios.post(API_URL + 'google-login/', {
        token,
    });
};


const register = (username, email, password) => {
    return axios.post(API_URL + 'register/', {
        username,
        email,
        password,
    });
};

const login = (username, password) => {
    return axios.post(API_URL + 'login/', {
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