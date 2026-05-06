// services/ecourseApi.js
import api from './api';

const API_BASE = '/courses';

// Public
export const getCourses = () => api.get(`${API_BASE}/`);
export const getCourseBySlug = (slug) => api.get(`${API_BASE}/${slug}/`);
export const getCourseDetail = (id) => api.get(`${API_BASE}/${id}/`);

// Enrollments
export const createEnrollment = (data) =>
    api.post(`${API_BASE}/enrollments/`, data);

export const getEnrollmentStatus = (orderNumber) =>
    api.get(`${API_BASE}/enrollments/status/${orderNumber}/`);

export const uploadCoursePaymentProof = (orderNumber, formData) =>
    api.post(`${API_BASE}/enrollments/status/${orderNumber}/pay/`, formData, {
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
export const getMyCourses = () =>
    api.get(`${API_BASE}/my-courses/`);

export const getInstructorCourses = getMyCourses;

export const createCourse = (formData) =>
    api.post(`${API_BASE}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateCourse = (id, formData) =>
    api.patch(`${API_BASE}/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteCourse = (id) =>
    api.delete(`${API_BASE}/${id}/`);

export const getCourseMaterials = (courseId) =>
    api.get(`${API_BASE}/materials/?course_id=${courseId}`);

// Materials
export const createMaterial = (formData) =>
    api.post(`${API_BASE}/materials/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updateMaterial = (id, formData) =>
    api.patch(`${API_BASE}/materials/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteMaterial = (id) =>
    api.delete(`${API_BASE}/materials/${id}/`);

// Sections (Not implemented in backend, keeping placeholders or removing)
// Removing to avoid 404s and confusion

// Admin
export const getAdminAllCourses = () =>
    api.get(`${API_BASE}/admin-courses/`);

export const deleteAdminCourse = (id) =>
    api.delete(`${API_BASE}/admin-courses/${id}/`);

// Certificates
export const getCourseCertificateSettings = (courseId) =>
    api.get(`${API_BASE}/${courseId}/certificate_settings/`);

export const updateCourseCertificateSettings = (courseId, formData) =>
    api.post(`${API_BASE}/${courseId}/certificate_settings/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const downloadCourseCertificate = (courseId) =>
    api.get(`${API_BASE}/${courseId}/download_certificate/`, {
        responseType: 'blob'
    });

export const getCourseBuyers = (courseId) =>
    api.get(`${API_BASE}/${courseId}/buyers/`);
