from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ZISConfigViewSet, ZISSubmissionViewSet

router = DefaultRouter()
router.register(r'config', ZISConfigViewSet)
router.register(r'submissions', ZISSubmissionViewSet, basename='zis-submission')

urlpatterns = [
    path('', include(router.urls)),
]
