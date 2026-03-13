import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const getAuthHeaders = () => {
    let token = localStorage.getItem('access');
    if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                token = userObj.access || userObj.token;
            } catch (e) { }
        }
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const forumApi = {
    getThreads: () => axios.get(`${API_URL}/forum/threads/`),
    getThread: (slug) => axios.get(`${API_URL}/forum/threads/${slug}/`),
    createThread: (data) => axios.post(`${API_URL}/forum/threads/`, data, { headers: getAuthHeaders() }),
    deleteThread: (slug) => axios.delete(`${API_URL}/forum/threads/${slug}/`, { headers: getAuthHeaders() }),
    replyToThread: (data) => axios.post(`${API_URL}/forum/replies/`, data, { headers: getAuthHeaders() }),
    deleteReply: (id) => axios.delete(`${API_URL}/forum/replies/${id}/`, { headers: getAuthHeaders() }),
    searchUsers: (query) => axios.get(`${API_URL}/forum/users/search/?q=${query}`, { headers: getAuthHeaders() }),
    getNotifications: () => axios.get(`${API_URL}/forum/notifications/`, { headers: getAuthHeaders() }),
    markNotificationRead: (id) => axios.post(`${API_URL}/forum/notifications/${id}/mark_read/`, {}, { headers: getAuthHeaders() }),
};
