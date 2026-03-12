// services/digitalProductApi.js
import api from './api';

const API_BASE = '/digital-products';

// Public
export const getDigitalProducts = () =>
    api.get(`${API_BASE}/products/`);

export const getDigitalProductBySlug = (slug) =>
    api.get(`${API_BASE}/products/${slug}/`);

// Orders (no auth needed)
export const createDigitalOrder = (data) =>
    api.post(`${API_BASE}/orders/`, data);

export const getDigitalOrderStatus = (orderNumber) =>
    api.get(`${API_BASE}/orders/status/${orderNumber}/`);

export const uploadPaymentProof = (orderNumber, formData) =>
    api.post(`${API_BASE}/orders/status/${orderNumber}/pay/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// Seller Profile
export const getSellerProfile = (username) =>
    api.get(`${API_BASE}/profiles/${username}/`);

// Dashboard Member - My Products
export const getMyProducts = () =>
    api.get(`${API_BASE}/products/my-products/`);

export const createProduct = (formData) =>
    api.post(`${API_BASE}/products/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateProduct = (id, formData) =>
    api.patch(`${API_BASE}/products/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteProduct = (id) =>
    api.delete(`${API_BASE}/products/${id}/`);

// Admin
export const getAdminAllProducts = () =>
    api.get(`${API_BASE}/admin/products/`);

export const deleteAdminProduct = (id) =>
    api.delete(`${API_BASE}/admin/products/${id}/`);

// Sales history for seller
export const getSellerSales = () =>
    api.get(`${API_BASE}/orders/my-sales/`);

export const updateOrderShipping = (orderId, data) =>
    api.post(`${API_BASE}/orders/${orderId}/update-shipping/`, data);

// Purchase history for buyer
export const getMyPurchases = () =>
    api.get(`${API_BASE}/orders/my-purchases/`);

// Dashboard Statistics
export const getSellerStats = () =>
    api.get(`${API_BASE}/orders/seller-stats/`);
