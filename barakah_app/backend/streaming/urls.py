from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StreamingSettingsView,
    StreamingChatViewSet,
    StreamingLikeView,
    StreamingRecordingViewSet,
    StreamingViewersView
)

router = DefaultRouter()
router.register(r'comments', StreamingChatViewSet, basename='streaming-comments')
router.register(r'recordings', StreamingRecordingViewSet, basename='streaming-recordings')

urlpatterns = [
    path('settings/', StreamingSettingsView.as_view(), name='streaming-settings'),
    path('likes/', StreamingLikeView.as_view(), name='streaming-likes'),
    path('viewers/', StreamingViewersView.as_view(), name='streaming-viewers'),
    path('', include(router.urls)),
]
