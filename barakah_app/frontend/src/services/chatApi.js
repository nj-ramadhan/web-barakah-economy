import api from './api';

const API_URL = '/chat/';

export const getCategories = () => {
    return api.get(`${API_URL}categories/`);
};

export const getSessions = () => {
    return api.get(`${API_URL}sessions/`);
};

export const createSession = (categoryId, consultantId = null) => {
    return api.post(`${API_URL}sessions/`, {
        category: categoryId,
        consultant: consultantId
    });
};

export const getConsultantsByCategory = (categoryId) => {
    return api.get(`${API_URL}consultants/?category=${categoryId}`);
};

export const getSessionDetail = (sessionId) => {
    return api.get(`${API_URL}sessions/${sessionId}/`);
};

export const getMessages = (sessionId, page = 1) => {
    return api.get(`${API_URL}messages/?session=${sessionId}&page=${page}`);
};

export const sendMessage = (formData) => {
    return api.post(`${API_URL}messages/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const markRead = (sessionId) => {
    return api.post(`${API_URL}messages/mark_read/`, { session: sessionId });
};

// Admin Management
export const adminGetCategories = () => api.get(`${API_URL}categories/`);
export const adminCreateCategory = (data) => api.post(`${API_URL}categories/`, data);
export const adminUpdateCategory = (id, data) => api.patch(`${API_URL}categories/${id}/`, data);
export const adminDeleteCategory = (id) => api.delete(`${API_URL}categories/${id}/`);
export const adminDeleteCommand = (id) => {
    return api.delete(`${API_URL}commands/${id}/`);
};

export const adminCreateCommand = (data) => {
    return api.post(`${API_URL}commands/`, data);
};

export const adminUpdateCommand = (id, data) => {
    return api.patch(`${API_URL}commands/${id}/`);
};

export const closeSession = (sessionId) => {
    return api.post(`${API_URL}sessions/${sessionId}/close_session/`, {});
};

export const submitReview = (data) => {
    return api.post(`${API_URL}reviews/`, data);
};

export const submitGeneralFeedback = (data) => {
    return api.post(`${API_URL}general-feedback/`, data);
};

export const adminGetFeedback = () => api.get(`${API_URL}general-feedback/`);
export const adminDeleteFeedback = (id) => api.delete(`${API_URL}general-feedback/${id}/`);

export const adminGetProfiles = () => api.get(`${API_URL}consultants/`);
export const adminCreateProfile = (data) => api.post(`${API_URL}consultants/`, data);
export const adminUpdateProfile = (id, data) => api.patch(`${API_URL}consultants/${id}/`, data);
export const adminDeleteProfile = (id) => api.delete(`${API_URL}consultants/${id}/`);

export const searchUsers = (q) => api.get(`/profiles/search/?q=${q}`);

export const adminGetAISettings = () => api.get(`${API_URL}ai-settings/`);
export const adminUpdateAISettings = (data) => api.patch(`${API_URL}ai-settings/update_settings/`, data);

export const toggleAISession = (sessionId, isActive) => {
    return api.post(`${API_URL}sessions/${sessionId}/toggle_ai/`, { is_ai_active: isActive });
};

export const getChatCommands = () => {
    return api.get(`${API_URL}commands/`);
};
