from django.urls import path
from .views import ActivityViewSet

# Manual action mapping to avoid 'drf_format_suffix' registration conflict
activity_list = ActivityViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
activity_detail = ActivityViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

urlpatterns = [
    path('activities/', activity_list, name='activity-list'),
    path('activities/<int:pk>/', activity_detail, name='activity-detail'),
]
