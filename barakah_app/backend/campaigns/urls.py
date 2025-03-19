from django.urls import path
from .views import CampaignViewSet, CampaignDetailView

# Endpoint untuk list dan create campaign
campaign_list = CampaignViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

# Endpoint untuk retrieve, update, dan delete campaign berdasarkan ID
campaign_detail = CampaignViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    path('', campaign_list, name='campaign-list'),  # List dan create
    path('<int:pk>/', campaign_detail, name='campaign-detail-id'),  # Detail berdasarkan ID
    path('<slug:slug>/', CampaignDetailView.as_view(), name='campaign-detail-slug'),  # Detail berdasarkan slug
]