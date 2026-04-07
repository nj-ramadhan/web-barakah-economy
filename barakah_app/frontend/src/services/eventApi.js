import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access ? { Authorization: `Bearer ${user.access}` } : {};
};

export const getEvents = (params = {}) => {
    return axios.get(`${API_BASE_URL}/api/events/`, { params });
};

export const getLandingEvents = () => {
    return axios.get(`${API_BASE_URL}/api/events/landing/`);
};

export const getEventDetail = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/`);
};

export const createEvent = (formData) => {
    return axios.post(`${API_BASE_URL}/api/events/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        }
    });
};

export const updateEvent = (slug, formData) => {
    const isFormData = formData instanceof FormData;
    return axios.patch(`${API_BASE_URL}/api/events/${slug}/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
        }
    });
};

export const deleteEvent = (slug) => {
    return axios.delete(`${API_BASE_URL}/api/events/${slug}/`, {
        headers: getAuthHeaders()
    });
};

export const getMyEvents = () => {
    return axios.get(`${API_BASE_URL}/api/events/my_events/`, {
        headers: getAuthHeaders()
    });
};

// Registration Logic
export const registerForEvent = (slug, formData) => {
    return axios.post(`${API_BASE_URL}/api/events/${slug}/register/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
};

export const getEventParticipants = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/participants/`);
};

// Submissions (Management)
export const getEventRegistrations = (params = {}) => {
    return axios.get(`${API_BASE_URL}/api/events/registrations/`, {
        params,
        headers: getAuthHeaders()
    });
};

export const approveRegistration = (id) => {
    return axios.post(`${API_BASE_URL}/api/events/registrations/${id}/approve/`, {}, {
        headers: getAuthHeaders()
    });
};

export const rejectRegistration = (id) => {
    return axios.post(`${API_BASE_URL}/api/events/registrations/${id}/reject/`, {}, {
        headers: getAuthHeaders()
    });
};
