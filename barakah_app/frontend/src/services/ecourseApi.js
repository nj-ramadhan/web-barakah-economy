// services/ecourseApi.js
import api from './api';

const API_BASE = '/courses';

// Public
export const getCourses = () => api.get(`${API_BASE}/list/`);
export const getCourseBySlug = (slug) => api.get(`${API_BASE}/detail/${slug}/`);

// Enrollments
export const createEnrollment = (data) =>
    api.post(`${API_BASE}/enroll/`, data);

export const getEnrollmentStatus = (orderNumber) =>
    api.get(`${API_BASE}/enroll/status/${orderNumber}/`);

export const uploadCoursePaymentProof = (orderNumber, formData) =>
    api.post(`${API_BASE}/enroll/status/${orderNumber}/pay/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// My Courses (Learner)
export const getMyEnrolledCourses = () =>
    api.get(`${API_BASE}/enrollments/`);

export const getCourseStructure = (slug) =>
    api.get(`${API_BASE}/viewer/${slug}/structure/`);

export const getMaterialDetail = (slug, materialId) =>
    api.get(`${API_BASE}/viewer/${slug}/material/${materialId}/`);

// Instructor Dashboard
export const getInstructorCourses = () =>
    api.get(`${API_BASE}/instructor/courses/`);

export const createCourse = (formData) =>
    api.post(`${API_BASE}/instructor/courses/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateCourse = (id, formData) =>
    api.patch(`${API_BASE}/instructor/courses/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteCourse = (id) =>
    api.delete(`${API_BASE}/instructor/courses/${id}/`);

// Sections & Materials
export const createSection = (data) =>
    api.post(`${API_BASE}/instructor/sections/`, data);

export const updateSection = (id, data) =>
    api.patch(`${API_BASE}/instructor/sections/${id}/`, data);

export const deleteSection = (id) =>
    api.delete(`${API_BASE}/instructor/sections/${id}/`);

export const createMaterial = (formData) =>
    api.post(`${API_BASE}/instructor/materials/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateMaterial = (id, formData) =>
    api.patch(`${API_BASE}/instructor/materials/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteMaterial = (id) =>
    api.delete(`${API_BASE}/instructor/materials/${id}/`);

// Admin
export const getAdminAllCourses = () =>
    api.get(`${API_BASE}/admin/courses/`);

export const deleteAdminCourse = (id) =>
    api.delete(`${API_BASE}/admin/courses/${id}/`);
