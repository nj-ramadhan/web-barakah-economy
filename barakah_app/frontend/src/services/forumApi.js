import api from './api';

const API_ROOT = '/forum';

export const forumApi = {
    getThreads: () => api.get(`${API_ROOT}/threads/`),
    getThread: (slug) => api.get(`${API_ROOT}/threads/${slug}/`),
    createThread: (data) => {
        // If data is FormData, send as is, otherwise it will be JSON by default in api interceptors if we pass it directly
        // But better to be explicit if we are going to use FormData for images
        return api.post(`${API_ROOT}/threads/`, data, {
            headers: (data instanceof FormData) ? { 'Content-Type': 'multipart/form-data' } : {}
        });
    },
    deleteThread: (slug) => api.delete(`${API_ROOT}/threads/${slug}/`),
    replyToThread: (data) => api.post(`${API_ROOT}/replies/`, data),
    deleteReply: (id) => api.delete(`${API_ROOT}/replies/${id}/`),
    searchUsers: (query) => api.get(`${API_ROOT}/users/search/?q=${query}`),
    getNotifications: () => api.get(`${API_ROOT}/notifications/`),
    markNotificationRead: (id) => api.post(`${API_ROOT}/notifications/${id}/mark_read/`, {}),
    likeThread: (slug) => api.post(`${API_ROOT}/threads/${slug}/like/`, {}),
    likeReply: (id) => api.post(`${API_ROOT}/replies/${id}/like/`, {}),
};
