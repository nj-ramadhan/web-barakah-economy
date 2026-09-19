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

    // Admin Moderation APIs
    getAdminThreads: (params = {}) => api.get(`${API_ROOT}/threads/`, { params }),
    getAdminReplies: (params = {}) => api.get(`${API_ROOT}/replies/`, { params }),
    approveThread: (slug) => api.post(`${API_ROOT}/threads/${slug}/approve/`, {}),
    rejectThread: (slug) => api.post(`${API_ROOT}/threads/${slug}/reject/`, {}),
    bulkApproveThreads: (ids = [], slugs = []) => api.post(`${API_ROOT}/threads/bulk_approve/`, { ids, slugs }),
    bulkRejectThreads: (ids = [], slugs = []) => api.post(`${API_ROOT}/threads/bulk_reject/`, { ids, slugs }),
    bulkDeleteThreads: (ids = [], slugs = []) => api.post(`${API_ROOT}/threads/bulk_delete/`, { ids, slugs }),

    approveReply: (id) => api.post(`${API_ROOT}/replies/${id}/approve/`, {}),
    rejectReply: (id) => api.post(`${API_ROOT}/replies/${id}/reject/`, {}),
    bulkApproveReplies: (ids = []) => api.post(`${API_ROOT}/replies/bulk_approve/`, { ids }),
    bulkRejectReplies: (ids = []) => api.post(`${API_ROOT}/replies/bulk_reject/`, { ids }),
    bulkDeleteReplies: (ids = []) => api.post(`${API_ROOT}/replies/bulk_delete/`, { ids }),
};
