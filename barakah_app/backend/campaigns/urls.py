from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import CampaignViewSet, CampaignShareView, CampaignRealizationViewSet

router = SimpleRouter()
router.register(r'realizations', CampaignRealizationViewSet, basename='campaign-realization')
router.register(r'', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('share/<slug:slug>/', CampaignShareView.as_view(), name='campaign-share'), # Share link preview
    path('', include(router.urls)),
]