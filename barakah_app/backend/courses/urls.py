from django.urls import path
from .views import CourseViewSet, CourseDetailViewSet, EnrollmentViewSet, MaterialViewSet

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
    path('', course_list, name='course-list'),  # List dan create
    path('<int:pk>/', course_detail, name='course-detail-id'),  # Detail berdasarkan ID
    path('<slug:slug>/', CourseDetailViewSet.as_view(), name='course-detail-slug'),  # Detail berdasarkan slug   
    path('enrollments/', EnrollmentViewSet.as_view({'get': 'list', 'post': 'create'}), name='enrollment-list-create'),
    path('enrollments/<int:pk>/', EnrollmentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='enrollment-detail'),
    path('materials/', MaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='material-list-create'), 
]