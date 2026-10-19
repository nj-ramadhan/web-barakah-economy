// services/serviceApi.js
import axios from 'axios';
import api from './api';

const API_BASE = `${process.env.REACT_APP_API_BASE_URL || ''}/api/services`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))?.access : null);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Public
export const getServices = (params = {}) => {
  return axios.get(`${API_BASE}/`, { params });
};

export const getServiceDetail = (slug) => {
  return axios.get(`${API_BASE}/${slug}/`, {
    headers: getAuthHeaders()
  });
};

export const toggleLikeService = (slug) => {
  return axios.post(`${API_BASE}/${slug}/like/`, {}, {
    headers: getAuthHeaders()
  });
};

// User Service Management
export const getMyServices = () => {
  return axios.get(`${API_BASE}/my_services/`, {
    headers: getAuthHeaders()
  });
};

export const createService = (formData) => {
  return axios.post(`${API_BASE}/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    }
  });
};

export const updateService = (slug, formData) => {
  return axios.patch(`${API_BASE}/${slug}/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    }
  });
};

export const deleteService = (slug) => {
  return axios.delete(`${API_BASE}/${slug}/`, {
    headers: getAuthHeaders()
  });
};

// Admin Moderation
export const getAdminServices = (status = 'all') => {
  return axios.get(`${API_BASE}/admin_list/`, {
    params: { status },
    headers: getAuthHeaders()
  });
};

export const approveService = (slug) => {
  return axios.post(`${API_BASE}/${slug}/approve/`, {}, {
    headers: getAuthHeaders()
  });
};

export const rejectService = (slug, reason = '') => {
  return axios.post(`${API_BASE}/${slug}/reject/`, { reason }, {
    headers: getAuthHeaders()
  });
};

// Publishing & Renewal (30 Days)
export const renewService = (slug, data = {}) => {
  return axios.post(`${API_BASE}/${slug}/renew/`, data, {
    headers: getAuthHeaders()
  });
};

export const checkServicePaymentStatus = (slug) => {
  return axios.get(`${API_BASE}/${slug}/check_payment_status/`, {
    headers: getAuthHeaders()
  });
};
