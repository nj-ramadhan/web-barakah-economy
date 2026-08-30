import api from './api';

const siteContentService = {
  getPartners: () => api.get('/site-content/partners/'),
  getTestimonials: () => api.get('/site-content/testimonials/'),
  getActivities: () => api.get('/site-content/activities/'),
  getAboutUs: () => api.get('/site-content/about-us/'),
  getAnnouncements: () => api.get('/site-content/announcements/'),
  
  // What's New / Changelog
  getWhatsNew: (params) => api.get('/site-content/whats-new/', { params }),
  getWhatsNewDetail: (id) => api.get(`/site-content/whats-new/${id}/`),
  getLatestWhatsNewPopup: () => api.get('/site-content/whats-new/popup-latest/'),
  createWhatsNew: (formData) => api.post('/site-content/whats-new/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateWhatsNew: (id, formData) => api.patch(`/site-content/whats-new/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteWhatsNew: (id) => api.delete(`/site-content/whats-new/${id}/`),

  // What's New Feature Suggestions Pool
  getWhatsNewSuggestions: (params) => api.get('/site-content/whats-new-suggestions/', { params }),
  createWhatsNewSuggestion: (data) => api.post('/site-content/whats-new-suggestions/', data),
  updateWhatsNewSuggestion: (id, data) => api.patch(`/site-content/whats-new-suggestions/${id}/`, data),
  toggleSuggestionUsed: (id, data) => api.post(`/site-content/whats-new-suggestions/${id}/toggle-used/`, data),
  bulkMarkSuggestionsUsed: (data) => api.post('/site-content/whats-new-suggestions/bulk-mark-used/', data),
  deleteWhatsNewSuggestion: (id) => api.delete(`/site-content/whats-new-suggestions/${id}/`),


  // Admin actions
  createAnnouncement: (data) => api.post('/site-content/announcements/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAnnouncement: (id, data) => api.patch(`/site-content/announcements/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAnnouncement: (id) => api.delete(`/site-content/announcements/${id}/`),
};

export default siteContentService;

