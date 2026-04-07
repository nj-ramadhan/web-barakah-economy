from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventRegistrationViewSet

router = DefaultRouter()
router.register(r'registrations', EventRegistrationViewSet, basename='event_registrations')
router.register(r'', EventViewSet, basename='events')

urlpatterns = [
    path('', include(router.urls)),
]
