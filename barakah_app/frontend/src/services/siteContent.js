import api from './api';

const siteContentService = {
  getPartners: () => api.get('/site-content/partners/'),
  getTestimonials: () => api.get('/site-content/testimonials/'),
  getActivities: () => api.get('/site-content/activities/'),
  getAboutUs: () => api.get('/site-content/about-us/'),
  getAnnouncements: () => api.get('/site-content/announcements/'),
  
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
