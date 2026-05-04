import api from './api';

const siteContentService = {
  getPartners: () => api.get('/site_content/partners/'),
  getTestimonials: () => api.get('/site_content/testimonials/'),
  getActivities: () => api.get('/site_content/activities/'),
  getAboutUs: () => api.get('/site_content/about-us/'),
  getAnnouncements: () => api.get('/site_content/announcements/'),
  
  // Admin actions
  createAnnouncement: (data) => api.post('/site_content/announcements/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAnnouncement: (id, data) => api.patch(`/site_content/announcements/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAnnouncement: (id) => api.delete(`/site_content/announcements/${id}/`),
};

export default siteContentService;
