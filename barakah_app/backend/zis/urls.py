from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ZISConfigViewSet, ZISSubmissionViewSet

router = SimpleRouter()
router.register(r'config', ZISConfigViewSet)
router.register(r'submissions', ZISSubmissionViewSet, basename='zis-submission')

urlpatterns = [
    path('', include(router.urls)),
]
