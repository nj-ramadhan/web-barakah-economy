// src/services/campaigns.js
import api from './api';

export const getCampaigns = async (category = '') => {
  try {
    const params = category ? { category } : {};
    const response = await api.get('/campaigns/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
};

export const getCampaignById = async (id) => {
  try {
    const response = await api.get(`/campaigns/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching campaign with id ${id}:`, error);
    throw error;
  }
};

export const getCampaignBySlug = async (slug) => {
  try {
    const response = await api.get(`/campaigns/${slug}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching campaign with slug ${slug}:`, error);
    throw error;
  }
};