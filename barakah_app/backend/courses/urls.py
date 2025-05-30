from django.urls import path
from .views import CourseViewSet, CourseDetailViewSet, CourseEnrollmentViewSet, CourseMaterialViewSet, CoursePaymentConfirmationView

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
    path('enrollments/', CourseEnrollmentViewSet.as_view({'get': 'list', 'post': 'create'}), name='enrollment-list-create'),
    path('enrollments/<int:pk>/', CourseEnrollmentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='enrollment-detail'),
    path('materials/', CourseMaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='material-list-create'), 
    path('<slug:slug>/payment-confirmation/', CoursePaymentConfirmationView.as_view(), name='course-payment-confirmation'),
    path('<int:pk>/', course_detail, name='course-detail-id'),  # Detail by ID
    path('<slug:slug>/', CourseDetailViewSet.as_view(), name='course-detail-slug'),  # Detail by slug   
    path('', course_list, name='course-list'),  # List and create
]