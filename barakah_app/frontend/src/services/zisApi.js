import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api/zis`;

const getAuthHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { Authorization: `Bearer ${user?.access}` };
};

export const getActiveZISConfig = () => {
    return axios.get(`${API_URL}/config/active/`, { headers: getAuthHeader() });
};

export const submitZIS = (formData) => {
    return axios.post(`${API_URL}/submissions/`, formData, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const getMyZISHistory = () => {
    return axios.get(`${API_URL}/submissions/`, { headers: getAuthHeader() });
};

// Admin APIs
export const getAllZISSubmissions = () => {
    return axios.get(`${API_URL}/submissions/`, { headers: getAuthHeader() });
};

export const verifyZIS = (id) => {
    return axios.post(`${API_URL}/submissions/${id}/verify/`, {}, { headers: getAuthHeader() });
};

export const rejectZIS = (id, reason) => {
    return axios.post(`${API_URL}/submissions/${id}/reject/`, { reason }, { headers: getAuthHeader() });
};

export const updateZISConfig = (id, data) => {
    return axios.patch(`${API_URL}/config/${id}/`, data, { headers: getAuthHeader() });
};

export const createZISConfig = (data) => {
    return axios.post(`${API_URL}/config/`, data, { headers: getAuthHeader() });
};

export const getZISConfigs = () => {
    return axios.get(`${API_URL}/config/`, { headers: getAuthHeader() });
};
