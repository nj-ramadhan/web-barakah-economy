from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet, ArticleImageViewSet, ArticleShareView

router = DefaultRouter()
router.register(r'articles', ArticleViewSet, basename='articles')
router.register(r'article-images', ArticleImageViewSet, basename='article-images')

urlpatterns = [
    path('', include(router.urls)),
    path('articles/share/<slug:slug>/', ArticleShareView.as_view(), name='article-share'),
    path('ckeditor/', include('ckeditor_uploader.urls')),
]
