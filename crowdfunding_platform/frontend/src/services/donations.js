// src/services/donations.js
import api from './api';

export const createDonation = async (donationData) => {
  try {
    const response = await api.post('/donations/', donationData);
    return response.data;
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
};