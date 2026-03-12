import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL + '/api/chat/';

const getAuthHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.access) {
        return { Authorization: `Bearer ${user.access}` };
    }
    return {};
};

export const getCategories = () => {
    return axios.get(`${API_URL}categories/`, { headers: getAuthHeader() });
};

export const getSessions = () => {
    return axios.get(`${API_URL}sessions/`, { headers: getAuthHeader() });
};

export const createSession = (categoryId) => {
    return axios.post(`${API_URL}sessions/`, { category: categoryId }, { headers: getAuthHeader() });
};

export const getSessionDetail = (sessionId) => {
    return axios.get(`${API_URL}sessions/${sessionId}/`, { headers: getAuthHeader() });
};

export const getMessages = (sessionId, page = 1) => {
    return axios.get(`${API_URL}messages/?session=${sessionId}&page=${page}`, { headers: getAuthHeader() });
};

export const sendMessage = (formData) => {
    return axios.post(`${API_URL}messages/`, formData, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const markRead = (sessionId) => {
    return axios.post(`${API_URL}messages/mark_read/`, { session: sessionId }, { headers: getAuthHeader() });
};

// Admin Management
export const adminGetCategories = () => axios.get(`${API_URL}categories/`, { headers: getAuthHeader() });
export const adminCreateCategory = (data) => axios.post(`${API_URL}categories/`, data, { headers: getAuthHeader() });
export const adminUpdateCategory = (id, data) => axios.patch(`${API_URL}categories/${id}/`, data, { headers: getAuthHeader() });
export const adminDeleteCategory = (id) => axios.delete(`${API_URL}categories/${id}/`, { headers: getAuthHeader() });

export const adminGetProfiles = () => axios.get(`${API_URL}consultants/`, { headers: getAuthHeader() });
export const adminCreateProfile = (data) => axios.post(`${API_URL}consultants/`, data, { headers: getAuthHeader() });
export const adminUpdateProfile = (id, data) => axios.patch(`${API_URL}consultants/${id}/`, data, { headers: getAuthHeader() });
export const adminDeleteProfile = (id) => axios.delete(`${API_URL}consultants/${id}/`, { headers: getAuthHeader() });

export const searchUsers = (q) => axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/search/?q=${q}`, { headers: getAuthHeader() });

export const adminGetAISettings = () => axios.get(`${API_URL}ai-settings/`, { headers: getAuthHeader() });
export const adminUpdateAISettings = (data) => axios.patch(`${API_URL}ai-settings/update_settings/`, data, { headers: getAuthHeader() });

export const toggleAISession = (sessionId, isActive) => {
    return axios.post(`${API_URL}sessions/${sessionId}/toggle_ai/`, { is_ai_active: isActive }, { headers: getAuthHeader() });
};
