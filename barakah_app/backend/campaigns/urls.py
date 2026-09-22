from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import CampaignViewSet, CampaignShareView, CampaignRealizationViewSet, CampaignOgImageView

router = SimpleRouter()
router.register(r'realizations', CampaignRealizationViewSet, basename='campaign-realization')
router.register(r'', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('<str:slug>/og-image.jpg', CampaignOgImageView.as_view(), name='campaign-og-image-str-jpg'),
    path('<str:slug>/og-image/', CampaignOgImageView.as_view(), name='campaign-og-image-str'),
    path('<slug:slug>/og-image.jpg', CampaignOgImageView.as_view(), name='campaign-og-image-slug-jpg'),
    path('<slug:slug>/og-image/', CampaignOgImageView.as_view(), name='campaign-og-image-slug'),
    path('share/<slug:slug>/', CampaignShareView.as_view(), name='campaign-share'), # Share link preview
    path('', include(router.urls)),
]