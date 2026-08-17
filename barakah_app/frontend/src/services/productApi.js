// services/productApi.js
import api from './api';

const API_BASE = '/products';

export const getProducts = (params = {}) =>
    api.get(`${API_BASE}/`, { params });

export const getProductBySlug = (slug) =>
    api.get(`${API_BASE}/${slug}/`);

export const toggleLikeProduct = (id) =>
    api.post(`${API_BASE}/${id}/like/`);

export const getVouchers = () =>
    api.get(`${API_BASE}/vouchers/`);

export const validateVoucher = (code) =>
    api.post(`${API_BASE}/vouchers/validate/`, { code });

// Testimoni APIs
export const addTestimoniAdmin = (idOrSlug, formData) =>
    api.post(`${API_BASE}/${idOrSlug}/add_testimoni_admin/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

export const addTestimoniBuyer = (idOrSlug, formData) =>
    api.post(`${API_BASE}/${idOrSlug}/add_testimoni_buyer/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

export const deleteTestimoni = (idOrSlug, testimoniId) =>
    api.delete(`${API_BASE}/${idOrSlug}/testimonies/${testimoniId}/`);

// Promotion / Campaign APIs
export const getProductPromotion = (idOrSlug) =>
    api.get(`${API_BASE}/${idOrSlug}/promotion/`);

export const setProductPromotion = (idOrSlug, promoData) =>
    api.post(`${API_BASE}/${idOrSlug}/promotion/`, promoData);

export const deleteProductPromotion = (idOrSlug) =>
    api.delete(`${API_BASE}/${idOrSlug}/promotion/`);

// Unreviewed Products
export const getUnreviewedProducts = () =>
    api.get('/orders/unreviewed-products/');
