from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ThreadViewSet, ReplyViewSet, MentionNotificationViewSet, UserSearchAPIView

router = SimpleRouter()
router.register(r'threads', ThreadViewSet, basename='thread')
router.register(r'replies', ReplyViewSet, basename='reply')
router.register(r'notifications', MentionNotificationViewSet, basename='notification')

urlpatterns = [
    path('users/search/', UserSearchAPIView.as_view(), name='user-search'),
    path('', include(router.urls)),
]
