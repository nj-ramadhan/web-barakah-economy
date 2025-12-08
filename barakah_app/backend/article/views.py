from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Article, ArticleImage
from .serializers import ArticleSerializer, ArticleImageSerializer, ArticleImageUploadSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().order_by('-id')
    serializer_class = ArticleSerializer
    lookup_field = 'slug' # Default lookup pakai slug

    def get_object(self):
        """Logic Hybrid: Cek Slug dulu, kalau gagal cek ID"""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get('slug')
        obj = None

        # 1. Coba cari pakai ID jika inputnya angka
        if lookup_value is not None and lookup_value.isdigit():
            obj = queryset.filter(id=lookup_value).first()

        # 2. Jika belum ketemu, cari pakai Slug
        if not obj:
            obj = get_object_or_404(queryset, slug=lookup_value)

        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['post'], url_path='upload-images', parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, slug=None):
        article = self.get_object()
        serializer = ArticleImageUploadSerializer(data=request.data)

        if serializer.is_valid():
            images = serializer.validated_data['images']
            title = serializer.validated_data.get('title')
            saved_files = []

            for img in images:
                obj = ArticleImage.objects.create(
                    article=article,
                    title=title or img.name,
                    path=img
                )
                saved_files.append(ArticleImageSerializer(obj, context={'request': request}).data)

            return Response({
                "message": "Images uploaded successfully",
                "files": saved_files
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ArticleImageViewSet(viewsets.ModelViewSet):
    queryset = ArticleImage.objects.all().order_by('-id')
    serializer_class = ArticleImageSerializer
    parser_classes = [MultiPartParser, FormParser]