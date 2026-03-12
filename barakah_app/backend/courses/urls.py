from django.urls import path
from .views import (
    CourseViewSet, CourseDetailViewSet, CourseEnrollmentViewSet, 
    CourseMaterialViewSet, CoursePaymentConfirmationView, 
    UserCourseProgressViewSet, CertificateRequestViewSet, AdminCourseViewSet
)

# Endpoint untuk list dan create course
course_list = CourseViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

# Endpoint untuk retrieve, update, dan delete course berdasarkan ID
course_detail = CourseViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    path('my-courses/', CourseViewSet.as_view({'get': 'my_courses'}), name='my-courses'),
    path('enrollments/', CourseEnrollmentViewSet.as_view({'get': 'list', 'post': 'create'}), name='enrollment-list-create'),
    path('enrollments/<int:pk>/', CourseEnrollmentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='enrollment-detail'),
    path('materials/', CourseMaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='material-list-create'),
    path('materials/<int:pk>/', CourseMaterialViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='material-detail'),
    path('progress/', UserCourseProgressViewSet.as_view({'get': 'list', 'post': 'create'}), name='progress-list-create'),
    path('certificate-requests/', CertificateRequestViewSet.as_view({'get': 'list', 'post': 'create'}), name='cert-request-list-create'),
    path('certificate-requests/by-course/<int:course_id>/', CertificateRequestViewSet.as_view({'get': 'by_course'}), name='cert-request-by-course'),
    path('certificate-requests/<int:pk>/', CertificateRequestViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='cert-request-detail'),
    path('<slug:slug>/payment-confirmation/', CoursePaymentConfirmationView.as_view(), name='course-payment-confirmation'),
    path('admin-courses/', AdminCourseViewSet.as_view({'get': 'list'}), name='admin-course-list'),
    path('admin-courses/<int:pk>/', AdminCourseViewSet.as_view({'delete': 'destroy', 'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='admin-course-detail'),
    path('<int:pk>/', course_detail, name='course-detail-id'),  # Detail by ID
    path('<slug:slug>/', CourseDetailViewSet.as_view(), name='course-detail-slug'),  # Detail by slug   
    path('', course_list, name='course-list'),  # List and create
]