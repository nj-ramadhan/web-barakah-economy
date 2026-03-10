from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartnerViewSet, TestimonialViewSet, ActivityViewSet, ActivityShareView

router = DefaultRouter()
router.register(r'partners', PartnerViewSet)
router.register(r'testimonials', TestimonialViewSet)
router.register(r'activities', ActivityViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('activities/share/<int:pk>/', ActivityShareView.as_view({'get': 'retrieve'}), name='activity-share'),
]
