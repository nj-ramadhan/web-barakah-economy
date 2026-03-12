// services/ecourseApi.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function getAuthHeaders() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.access) {
        return { Authorization: `Bearer ${user.access}` };
    }
    return {};
}

// Public Courses
export const getCourses = (search = '') =>
    axios.get(`${API_BASE}/api/courses/${search ? `?search=${search}` : ''}`);

export const getCourseDetail = (slug) =>
    axios.get(`${API_BASE}/api/courses/${slug}/`);

// Instructor Management
export const getMyCourses = () =>
    axios.get(`${API_BASE}/api/courses/my-courses/`, {
        headers: getAuthHeaders(),
    });

export const createCourse = (formData) =>
    axios.post(`${API_BASE}/api/courses/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const updateCourse = (id, formData) =>
    axios.patch(`${API_BASE}/api/courses/${id}/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const deleteCourse = (id) =>
    axios.delete(`${API_BASE}/api/courses/${id}/`, {
        headers: getAuthHeaders(),
    });

// Materials Management
export const getCourseMaterials = (courseId) =>
    axios.get(`${API_BASE}/api/courses/materials/?course_id=${courseId}`, {
        headers: getAuthHeaders(),
    });

export const createMaterial = (formData) =>
    axios.post(`${API_BASE}/api/courses/materials/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const updateMaterial = (id, formData) =>
    axios.patch(`${API_BASE}/api/courses/materials/${id}/`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
    });

export const deleteMaterial = (id) =>
    axios.delete(`${API_BASE}/api/courses/materials/${id}/`, {
        headers: getAuthHeaders(),
    });

// Enrollment & Progress
export const enrollInCourse = (courseId) =>
    axios.post(`${API_BASE}/api/courses/enrollments/`, { course: courseId }, {
        headers: getAuthHeaders(),
    });

export const getMyEnrollments = () =>
    axios.get(`${API_BASE}/api/courses/enrollments/`, {
        headers: getAuthHeaders(),
    });

export const markMaterialCompleted = (materialId) =>
    axios.post(`${API_BASE}/api/courses/progress/`, { material: materialId }, {
        headers: getAuthHeaders(),
    });

export const getUserProgress = () =>
    axios.get(`${API_BASE}/api/courses/progress/`, {
        headers: getAuthHeaders(),
    });

// Certificates
export const getCertificateRequest = (courseId) =>
    axios.get(`${API_BASE}/api/courses/certificate-requests/by-course/${courseId}/`, {
        headers: getAuthHeaders(),
    });

export const requestCertificate = (data) =>
    axios.post(`${API_BASE}/api/courses/certificate-requests/`, data, {
        headers: getAuthHeaders(),
    });

export const getAdminAllCourses = () =>
    axios.get(`${API_BASE}/api/courses/admin-courses/`, {
        headers: getAuthHeaders(),
    });

export const deleteAdminCourse = (id) =>
    axios.delete(`${API_BASE}/api/courses/admin-courses/${id}/`, {
        headers: getAuthHeaders(),
    });
