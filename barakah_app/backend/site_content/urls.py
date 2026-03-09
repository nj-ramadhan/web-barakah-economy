from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartnerViewSet, TestimonialViewSet

router = DefaultRouter()
router.register(r'partners', PartnerViewSet)
router.register(r'testimonials', TestimonialViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
