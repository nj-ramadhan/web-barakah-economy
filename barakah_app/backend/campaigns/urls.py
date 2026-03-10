from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, CampaignDetailView, CampaignShareView, CampaignRealizationViewSet

router = DefaultRouter()
router.register(r'realizations', CampaignRealizationViewSet, basename='campaign-realization')
router.register(r'', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('', include(router.urls)),
    path('share/<slug:slug>/', CampaignShareView.as_view(), name='campaign-share'), # Share link preview
    path('<slug:slug>/', CampaignDetailView.as_view(), name='campaign-detail-slug'),  # Detail berdasarkan slug (must be last)
]