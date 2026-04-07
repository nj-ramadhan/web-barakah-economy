from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ArticleViewSet, ArticleImageViewSet, ArticleShareView

router = SimpleRouter()
router.register(r'articles', ArticleViewSet, basename='articles')
router.register(r'article-images', ArticleImageViewSet, basename='article-images')

urlpatterns = [
    path('articles/share/<slug:slug>/', ArticleShareView.as_view(), name='article-share'),
    path('', include(router.urls)),
    path('ckeditor/', include('ckeditor_uploader.urls')),
]
