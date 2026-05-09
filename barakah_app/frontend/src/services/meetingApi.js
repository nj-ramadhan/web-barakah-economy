import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.access ? { Authorization: `Bearer ${user.access}` } : {};
};

export const getMeetings = (params = {}) => {
    return axios.get(`${API_BASE_URL}/api/meetings/`, { 
        params,
        headers: getAuthHeaders()
    });
};

export const getMeetingDetail = (slug) => {
    return axios.get(`${API_BASE_URL}/api/meetings/${slug}/`, {
        headers: getAuthHeaders()
    });
};

export const createMeeting = (formData) => {
    const isFormData = formData instanceof FormData;
    return axios.post(`${API_BASE_URL}/api/meetings/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
        }
    });
};

export const updateMeeting = (slug, formData) => {
    const isFormData = formData instanceof FormData;
    return axios.patch(`${API_BASE_URL}/api/meetings/${slug}/`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
        }
    });
};

export const deleteMeeting = (slug) => {
    return axios.delete(`${API_BASE_URL}/api/meetings/${slug}/`, {
        headers: getAuthHeaders()
    });
};

export const getMeetingParticipants = (slug) => {
    return axios.get(`${API_BASE_URL}/api/meetings/${slug}/participants/`, {
        headers: getAuthHeaders()
    });
};

export const addMeetingParticipants = (slug, userIds) => {
    return axios.post(`${API_BASE_URL}/api/meetings/${slug}/add_participants/`, { user_ids: userIds }, {
        headers: getAuthHeaders()
    });
};

export const updateMeetingAttendance = (slug, data) => {
    return axios.post(`${API_BASE_URL}/api/meetings/${slug}/update_attendance/`, data, {
        headers: getAuthHeaders()
    });
};

export const blastMeetingWhatsapp = (slug, message, participantIds = null) => {
    return axios.post(`${API_BASE_URL}/api/meetings/${slug}/blast_whatsapp/`, { 
        message,
        participant_ids: participantIds
    }, {
        headers: getAuthHeaders()
    });
};

export const exportMeetingCsv = (slug) => {
    return axios.get(`${API_BASE_URL}/api/meetings/${slug}/export_csv/`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
    });
};
