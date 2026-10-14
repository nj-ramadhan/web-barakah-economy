import api from './api';

// --- PUBLIC & SELLER DETAIL ---
export const getPublicLandingPage = (slug) => {
    return api.get(`/landing-pages/${slug}/`);
};

export const getLandingPageDetail = (slug) => {
    return api.get(`/landing-pages/${slug}/`);
};

// --- SELLER / USER CRUD ---
export const getMyLandingPages = () => {
    return api.get(`/landing-pages/my_pages/`);
};

export const getLandingPageQuota = () => {
    return api.get(`/landing-pages/quota/`);
};

export const getLinkableItems = () => {
    return api.get(`/landing-pages/my_linkable_items/`);
};

export const uploadLandingPageGalleryImage = (formData) => {
    return api.post(`/landing-pages/upload_gallery_image/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const createLandingPage = (formData) => {
    return api.post(`/landing-pages/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const updateLandingPage = (slug, formData) => {
    return api.patch(`/landing-pages/${slug}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const deleteLandingPage = (slug) => {
    return api.delete(`/landing-pages/${slug}/`);
};

// --- SELLER ACTIONS ---
export const togglePublishLandingPage = (slug) => {
    return api.post(`/landing-pages/${slug}/toggle_publish/`);
};

// --- SLOT & RENEWAL ORDERS ---
export const createLandingPageSlotOrder = (slotsCount = 1, paymentMethod = 'dynaqris') => {
    return api.post(`/landing-pages/orders/`, {
        order_type: 'slot',
        slots_count: slotsCount,
        payment_method: paymentMethod
    });
};

export const createLandingPageRenewalOrder = (landingPageId, durationMonths = 1, paymentMethod = 'dynaqris') => {
    return api.post(`/landing-pages/orders/`, {
        order_type: 'renewal',
        landing_page: landingPageId,
        duration_months: durationMonths,
        payment_method: paymentMethod
    });
};

export const getLandingPageSlotOrderStatus = (orderId) => {
    return api.get(`/landing-pages/orders/${orderId}/status/`);
};

// --- ADMIN ---
export const getLandingPageAdminSettings = () => {
    return api.get(`/landing-pages/admin-settings/`);
};

export const updateLandingPageAdminSettings = (data) => {
    return api.put(`/landing-pages/admin-settings/`, data);
};

export const getLandingPageAdminAll = () => {
    return api.get(`/landing-pages/admin-all/`);
};

export const updateLandingPageAdminItem = (data) => {
    return api.patch(`/landing-pages/admin-all/`, data);
};

export const adminSetLandingPageExpiry = (slug, data) => {
    return api.post(`/landing-pages/${slug}/admin_update_expiry/`, data);
};
