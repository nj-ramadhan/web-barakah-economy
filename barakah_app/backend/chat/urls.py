from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConsultantCategoryViewSet, ConsultantProfileViewSet, ChatSessionViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'categories', ConsultantCategoryViewSet, basename='consultant-category')
router.register(r'consultants', ConsultantProfileViewSet)
router.register(r'sessions', ChatSessionViewSet, basename='chat-session')
router.register(r'messages', MessageViewSet, basename='chat-message')

urlpatterns = [
    path('', include(router.urls)),
]
