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
    return axios.get(`${API_BASE_URL}/api/events/${slug}/`, {
        headers: getAuthHeaders()
    });
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
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        }
    });
};

export const manualRegisterParticipant = (slug, data) => {
    return axios.post(`${API_BASE_URL}/api/events/${slug}/manual_register/`, data, {
        headers: getAuthHeaders()
    });
};

export const getEventParticipants = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/participants/`, {
        headers: getAuthHeaders()
    });
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

export const updateEventRegistration = (id, data) => {
    return axios.patch(`${API_BASE_URL}/api/events/registrations/${id}/`, data, {
        headers: getAuthHeaders()
    });
};

export const bulkDeleteRegistrations = (ids) => {
    return axios.post(`${API_BASE_URL}/api/events/registrations/bulk_delete/`, { ids }, {
        headers: getAuthHeaders()
    });
};

export const exportRegistrationsCsv = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/export_registrations/`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
    });
};

export const blastEventWhatsapp = (slug, message, registrationIds = null, imageBase64 = null) => {
    return axios.post(`${API_BASE_URL}/api/events/${slug}/blast_whatsapp/`, { 
        message,
        registration_ids: registrationIds,
        image_base64: imageBase64
    }, {
        headers: getAuthHeaders()
    });
};

export const getGlobalRegistrations = (params = {}) => {
    return axios.get(`${API_BASE_URL}/api/events/global_registrations/`, {
        params,
        headers: getAuthHeaders()
    });
};

export const globalBlastWhatsapp = (message, registrationIds, imageBase64 = null) => {
    return axios.post(`${API_BASE_URL}/api/events/global_blast_whatsapp/`, { 
        message,
        registration_ids: registrationIds,
        image_base64: imageBase64
    }, {
        headers: getAuthHeaders()
    });
};

export const addDocumentationImages = (slug, formData) => {
    return axios.post(`${API_BASE_URL}/api/events/${slug}/add_documentation_images/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        }
    });
};

export const deleteDocumentationImage = (slug, imageId) => {
    return axios.delete(`${API_BASE_URL}/api/events/${slug}/delete_documentation_image/`, {
        data: { image_id: imageId },
        headers: getAuthHeaders()
    });
};

export const getCertificateSettings = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/certificate_settings/`, {
        headers: getAuthHeaders()
    });
};

export const updateCertificateSettings = (slug, formData) => {
    return axios.post(`${API_BASE_URL}/api/events/${slug}/certificate_settings/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        }
    });
};

export const downloadCertificate = (slug) => {
    return axios.get(`${API_BASE_URL}/api/events/${slug}/download_certificate/`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
    });
};
