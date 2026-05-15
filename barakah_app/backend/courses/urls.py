from django.urls import path
from .views import (
    CourseViewSet, CourseDetailViewSet, CourseEnrollmentViewSet, 
    CourseMaterialViewSet, CoursePaymentConfirmationView, 
    UserCourseProgressViewSet, CertificateRequestViewSet, AdminCourseViewSet,
    CourseShareView
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
    path('share/<slug:slug>/', CourseShareView.as_view(), name='course-share'),
    path('<int:pk>/certificate_settings/', CourseViewSet.as_view({'get': 'certificate_settings', 'post': 'certificate_settings'}), name='course-certificate-settings'),
    path('<int:pk>/download_certificate/', CourseViewSet.as_view({'get': 'download_certificate'}), name='course-download-certificate'),
    path('<int:pk>/progress-recap/', CourseViewSet.as_view({'get': 'progress_recap'}), name='course-progress-recap'),
    path('<int:pk>/export-progress-csv/', CourseViewSet.as_view({'get': 'export_progress_csv'}), name='course-export-progress-csv'),
    path('<int:pk>/buyers/', CourseViewSet.as_view({'get': 'buyers'}), name='course-buyers'),
    path('<int:pk>/like/', CourseViewSet.as_view({'post': 'like'}), name='course-like-id'),
    path('<int:pk>/', course_detail, name='course-detail-id'),  # Detail by ID
    path('<slug:slug>/like/', CourseViewSet.as_view({'post': 'like'}), name='course-like-slug'),
    path('<slug:slug>/', CourseDetailViewSet.as_view(), name='course-detail-slug'),  # Detail by slug   
    path('', course_list, name='course-list'),  # List and create
]