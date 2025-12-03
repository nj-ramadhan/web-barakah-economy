from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet, ArticleImageViewSet

router = DefaultRouter()
router.register(r'articles', ArticleViewSet, basename='articles')
router.register(r'article-images', ArticleImageViewSet, basename='article-images')

urlpatterns = [
    path('', include(router.urls)),
    path('ckeditor/', include('ckeditor_uploader.urls')),
]
