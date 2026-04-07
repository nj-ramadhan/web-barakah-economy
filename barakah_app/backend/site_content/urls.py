from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import PartnerViewSet, TestimonialViewSet, ActivityViewSet, ActivityShareView, AboutUsViewSet

router = SimpleRouter()
router.register(r'about-us', AboutUsViewSet)
router.register(r'partners', PartnerViewSet)
router.register(r'testimonials', TestimonialViewSet)
router.register(r'activities', ActivityViewSet)

urlpatterns = [
    path('activities/share/<int:pk>/', ActivityShareView.as_view({'get': 'retrieve'}), name='activity-share'),
    path('', include(router.urls)),
]
