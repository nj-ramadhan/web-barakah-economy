from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConsultantCategoryViewSet, ConsultantProfileViewSet, ChatSessionViewSet,
    MessageViewSet, AISettingsViewSet, ChatCommandViewSet, ConsultationReviewViewSet,
    GeneralFeedbackViewSet
)

router = DefaultRouter()
router.register(r'categories', ConsultantCategoryViewSet, basename='consultant-category')
router.register(r'consultants', ConsultantProfileViewSet)
router.register(r'sessions', ChatSessionViewSet, basename='chat-session')
router.register(r'messages', MessageViewSet, basename='chat-message')
router.register(r'ai-settings', AISettingsViewSet, basename='ai-settings')
router.register(r'commands', ChatCommandViewSet, basename='chat-command')
router.register(r'reviews', ConsultationReviewViewSet, basename='chat-review')
router.register(r'general-feedback', GeneralFeedbackViewSet, basename='general-feedback')

urlpatterns = [
    path('', include(router.urls)),
]
