import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.access ? { Authorization: `Bearer ${user.access}` } : {};
};

export const getPublicPaymentConfig = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/payments/config/`);
    return response.data;
};

export const getAdminPaymentSettings = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/payments/admin-settings/`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const updateAdminPaymentSettings = async (data) => {
    const response = await axios.put(`${API_BASE_URL}/api/payments/admin-settings/`, data, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const testDynaQRISConnection = async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/payments/dynaqris/test-connection/`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const generateDynaQRIS = async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/payments/dynaqris/generate/`, data, {
        headers: getAuthHeaders()
    });
    return response.data;
};

export const checkDynaQRISStatus = async (type, referenceId) => {
    const response = await axios.get(`${API_BASE_URL}/api/payments/dynaqris/check-status/`, {
        params: { type, reference_id: referenceId }
    });
    return response.data;
};

export const checkAndroidWebhookStatus = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/payments/webhook/android-notification/`);
    return response.data;
};

export const testAndroidWebhook = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/api/payments/webhook/android-notification/`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-Android-Secret': payload.secret || ''
        }
    });
    return response.data;
};

