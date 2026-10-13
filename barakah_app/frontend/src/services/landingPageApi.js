import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '';

const getAuthHeaders = (isMultipart = false) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.access;
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (isMultipart) {
        headers['Content-Type'] = 'multipart/form-data';
    }
    return { headers };
};

// --- PUBLIC & SELLER DETAIL ---
export const getPublicLandingPage = (slug) => {
    return axios.get(`${API_BASE}/api/landing-pages/${slug}/`);
};

export const getLandingPageDetail = (slug) => {
    return axios.get(`${API_BASE}/api/landing-pages/${slug}/`, getAuthHeaders());
};

// --- SELLER / USER CRUD ---
export const getMyLandingPages = () => {
    return axios.get(`${API_BASE}/api/landing-pages/my_pages/`, getAuthHeaders());
};

export const getLandingPageQuota = () => {
    return axios.get(`${API_BASE}/api/landing-pages/quota/`, getAuthHeaders());
};

export const createLandingPage = (formData) => {
    return axios.post(`${API_BASE}/api/landing-pages/`, formData, getAuthHeaders(true));
};

export const updateLandingPage = (slug, formData) => {
    return axios.patch(`${API_BASE}/api/landing-pages/${slug}/`, formData, getAuthHeaders(true));
};

export const deleteLandingPage = (slug) => {
    return axios.delete(`${API_BASE}/api/landing-pages/${slug}/`, getAuthHeaders());
};

// --- SELLER ACTIONS ---
export const togglePublishLandingPage = (slug) => {
    return axios.post(`${API_BASE}/api/landing-pages/${slug}/toggle_publish/`, {}, getAuthHeaders());
};

// --- SLOT & RENEWAL ORDERS ---
export const createLandingPageSlotOrder = (slotsCount = 1, paymentMethod = 'dynaqris') => {
    return axios.post(
        `${API_BASE}/api/landing-pages/orders/`,
        { order_type: 'slot', slots_count: slotsCount, payment_method: paymentMethod },
        getAuthHeaders()
    );
};

export const createLandingPageRenewalOrder = (landingPageId, durationMonths = 1, paymentMethod = 'dynaqris') => {
    return axios.post(
        `${API_BASE}/api/landing-pages/orders/`,
        { order_type: 'renewal', landing_page: landingPageId, duration_months: durationMonths, payment_method: paymentMethod },
        getAuthHeaders()
    );
};

export const getLandingPageSlotOrderStatus = (orderId) => {
    return axios.get(`${API_BASE}/api/landing-pages/orders/${orderId}/status/`, getAuthHeaders());
};

// --- ADMIN ---
export const getLandingPageAdminSettings = () => {
    return axios.get(`${API_BASE}/api/landing-pages/admin-settings/`, getAuthHeaders());
};

export const updateLandingPageAdminSettings = (data) => {
    return axios.put(`${API_BASE}/api/landing-pages/admin-settings/`, data, getAuthHeaders());
};

export const getLandingPageAdminAll = () => {
    return axios.get(`${API_BASE}/api/landing-pages/admin-all/`, getAuthHeaders());
};

export const updateLandingPageAdminItem = (data) => {
    return axios.patch(`${API_BASE}/api/landing-pages/admin-all/`, data, getAuthHeaders());
};

export const adminSetLandingPageExpiry = (slug, data) => {
    return axios.post(`${API_BASE}/api/landing-pages/${slug}/admin_update_expiry/`, data, getAuthHeaders());
};
