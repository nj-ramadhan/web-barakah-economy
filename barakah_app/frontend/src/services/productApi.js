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
