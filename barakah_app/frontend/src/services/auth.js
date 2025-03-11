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
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    });
};

const logout = () => {
    localStorage.removeItem('user');
};

const authService = {
    googleLogin,
    register,
    login,
    logout,
};

export default authService;