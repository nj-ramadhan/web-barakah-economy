from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import MeetingViewSet

router = SimpleRouter()
router.register(r'', MeetingViewSet, basename='meeting')

urlpatterns = [
    path('', include(router.urls)),
]
