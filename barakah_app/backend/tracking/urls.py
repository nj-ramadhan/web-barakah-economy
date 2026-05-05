from django.urls import path
from .views import ActivityViewSet, WorkoutLogViewSet

activity_list = ActivityViewSet.as_view({'get': 'list', 'post': 'create'})
activity_detail = ActivityViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

workout_log_list = WorkoutLogViewSet.as_view({'get': 'list', 'post': 'create'})
workout_log_detail = WorkoutLogViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'})

urlpatterns = [
    path('activities/', activity_list, name='activity-list'),
    path('activities/<int:pk>/', activity_detail, name='activity-detail'),
    path('workout-logs/', workout_log_list, name='workout-log-list'),
    path('workout-logs/<int:pk>/', workout_log_detail, name='workout-log-detail'),
]
