from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StreamingSettingsView,
    StreamingChatViewSet,
    StreamingLikeView,
    StreamingRecordingViewSet,
    StreamingViewersView,
    StreamingWhipStatusView,
    StreamingExtendSessionView,
    EventStreamNotificationView,
)

router = DefaultRouter()
router.register(r'comments', StreamingChatViewSet, basename='streaming-comments')
router.register(r'recordings', StreamingRecordingViewSet, basename='streaming-recordings')

urlpatterns = [
    path('settings/', StreamingSettingsView.as_view(), name='streaming-settings'),
    path('likes/', StreamingLikeView.as_view(), name='streaming-likes'),
    path('viewers/', StreamingViewersView.as_view(), name='streaming-viewers'),
    # HP/Browser live streaming via WebRTC WHIP + MediaMTX
    path('whip-status/', StreamingWhipStatusView.as_view(), name='streaming-whip-status'),
    # Anti-logout session extender for admin during live
    path('extend-session/', StreamingExtendSessionView.as_view(), name='streaming-extend-session'),
    path('notifications/', EventStreamNotificationView.as_view(), name='streaming-notifications'),
    path('notifications/<int:pk>/mark-read/', EventStreamNotificationView.as_view(), name='streaming-notification-mark-read'),
    path('', include(router.urls)),
]
