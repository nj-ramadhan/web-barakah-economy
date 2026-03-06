// services/digitalProductApi.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function getAuthHeaders() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.access) {
        return { Authorization: `Bearer ${user.access}` };
    }
    return {};
}

// Public
export const getDigitalProducts = () =>
    axios.get(`${API_BASE}/api/digital-products/products/`);

export const getDigitalProductBySlug = (slug) =>
    axios.get(`${API_BASE}/api/digital-products/products/${slug}/`);

// Orders (no auth needed)
export const createDigitalOrder = (data) =>
    axios.post(`${API_BASE}/api/digital-products/orders/`, data, {
        headers: getAuthHeaders(),
    });

export const getDigitalOrderStatus = (orderNumber) =>
    axios.get(`${API_BASE}/api/digital-products/orders/status/${orderNumber}/`);

export const uploadPaymentProof = (orderNumber, formData) =>
    axios.post(`${API_BASE}/api/digital-products/orders/upload-proof/${orderNumber}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// Authenticated - My Products (Dashboard)
export const getMyDigitalProducts = () =>
    axios.get(`${API_BASE}/api/digital-products/products/my-products/`, {
        headers: getAuthHeaders(),
    });

export const createMyDigitalProduct = (formData) =>
    axios.post(`${API_BASE}/api/digital-products/products/my-products/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const updateMyDigitalProduct = (productId, formData) =>
    axios.patch(`${API_BASE}/api/digital-products/products/my-products/${productId}/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const deleteMyDigitalProduct = (productId) =>
    axios.delete(`${API_BASE}/api/digital-products/products/my-products/${productId}/`, {
        headers: getAuthHeaders(),
    });

// Balance & Withdrawals
export const getDigitalBalance = () =>
    axios.get(`${API_BASE}/api/digital-products/withdrawals/balance/`, {
        headers: getAuthHeaders(),
    });

export const getWithdrawalHistory = () =>
    axios.get(`${API_BASE}/api/digital-products/withdrawals/`, {
        headers: getAuthHeaders(),
    });

export const createWithdrawalRequest = (data) =>
    axios.post(`${API_BASE}/api/digital-products/withdrawals/`, data, {
        headers: getAuthHeaders(),
    });

// Public Profiles
export const getPublicDigitalProfile = (username) =>
    axios.get(`${API_BASE}/api/digital-products/products/public-profile/?username=${username}`);
