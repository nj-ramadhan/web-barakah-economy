// services/digitalProductApi.js
import api from './api';

const API_BASE = '/digital-products';

// Public
export const getDigitalProducts = () =>
    api.get(`${API_BASE}/products/`);

export const getDigitalProductBySlug = (slug) =>
    api.get(`${API_BASE}/products/${slug}/`);

export const getPublicDigitalProfile = (username) =>
    api.get(`${API_BASE}/products/public-profile/?username=${username}`);

export const getPopularSellers = () =>
    api.get(`${API_BASE}/products/popular-sellers/`);

// Alias for getPublicDigitalProfile
export const getSellerProfile = getPublicDigitalProfile;

// Orders (no auth needed)
export const createDigitalOrder = (data) =>
    api.post(`${API_BASE}/orders/`, data);

export const getDigitalOrderStatus = (orderNumber) =>
    api.get(`${API_BASE}/orders/status/${orderNumber}/`);

export const uploadPaymentProof = (orderNumber, formData) =>
    api.post(`${API_BASE}/orders/upload-proof/${orderNumber}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// Dashboard Member - My Products
export const getMyDigitalProducts = () =>
    api.get(`${API_BASE}/products/my-products/`);

export const createMyDigitalProduct = (formData) =>
    api.post(`${API_BASE}/products/my-products/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateMyDigitalProduct = (id, formData) =>
    api.patch(`${API_BASE}/products/my-products/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteMyDigitalProduct = (id) =>
    api.delete(`${API_BASE}/products/my-products/${id}/`);

// Aliases for dashboard functions (some components might use these)
export const getMyProducts = getMyDigitalProducts;
export const createProduct = createMyDigitalProduct;
export const updateProduct = updateMyDigitalProduct;
export const deleteProduct = deleteMyDigitalProduct;

// Admin Products
export const getAdminAllProducts = () =>
    api.get(`${API_BASE}/admin-products/`);

export const deleteAdminProduct = (id) =>
    api.delete(`${API_BASE}/admin-products/${id}/`);

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

// Withdrawals
export const getWithdrawalBalance = () =>
    api.get(`${API_BASE}/withdrawals/balance/`);

export const getMyWithdrawals = () =>
    api.get(`${API_BASE}/withdrawals/`);

export const createWithdrawalRequest = (data) =>
    api.post(`${API_BASE}/withdrawals/`, data);

// Aliases for dashboard statistics and history
export const getDigitalBalance = getWithdrawalBalance;
export const getWithdrawalHistory = getMyWithdrawals;

// Admin Withdrawals
export const getAdminWithdrawals = () =>
    api.get(`${API_BASE}/withdrawals/admin-list/`);

export const processAdminWithdrawal = (id, data) =>
    api.patch(`${API_BASE}/withdrawals/${id}/admin-process/`, data);

// Admin Transactions
export const getAdminAllTransactions = () =>
    api.get(`${API_BASE}/admin-products/all_transactions/`);
