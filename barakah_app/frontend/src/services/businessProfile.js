import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api/profiles/business-profiles/`;

const businessProfileService = {
  getBusinessProfiles: () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.get(API_URL, {
      headers: { Authorization: `Bearer ${user.access}` }
    });
  },

  getBusinessProfile: (id) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.get(`${API_URL}${id}/`, {
      headers: { Authorization: `Bearer ${user.access}` }
    });
  },

  createBusinessProfile: (data) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.post(API_URL, data, {
      headers: { 
        Authorization: `Bearer ${user.access}`,
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  updateBusinessProfile: (id, data) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.patch(`${API_URL}${id}/`, data, {
      headers: { 
        Authorization: `Bearer ${user.access}`,
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  deleteBusinessProfile: (id) => {
    const user = JSON.parse(localStorage.getItem('user'));
    return axios.delete(`${API_URL}${id}/`, {
      headers: { Authorization: `Bearer ${user.access}` }
    });
  }
};

export default businessProfileService;
