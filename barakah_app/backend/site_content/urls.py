from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    PartnerViewSet, TestimonialViewSet, ActivityViewSet, ActivityShareView, 
    AboutUsViewSet, AboutUsLegalDocumentViewSet, ManagementStatsView,
    AnnouncementViewSet,
    ActivityCalendarView, HeroBannerViewSet
)

router = SimpleRouter()
router.register(r'about-us', AboutUsViewSet)
router.register(r'about-us-legal-docs', AboutUsLegalDocumentViewSet)
router.register(r'partners', PartnerViewSet)
router.register(r'testimonials', TestimonialViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'announcements', AnnouncementViewSet)
router.register(r'hero-banners', HeroBannerViewSet)

urlpatterns = [
    path('activities/share/<int:pk>/', ActivityShareView.as_view({'get': 'retrieve'}), name='activity-share'),
    path('management-stats/', ManagementStatsView.as_view(), name='management-stats'),
    path('activity-calendar/', ActivityCalendarView.as_view(), name='activity-calendar'),
    path('', include(router.urls)),
]
