from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404, render
from django.conf import settings
from .models import Article, ArticleImage
from .serializers import ArticleSerializer, ArticleImageSerializer, ArticleImageUploadSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().order_by('-id')
    serializer_class = ArticleSerializer
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        # Allow authenticated users to create/update articles
        return [permissions.IsAuthenticated()]

    def get_object(self):
        """Logic Hybrid: Cek Slug dulu, kalau gagal cek ID"""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get('slug')
        obj = None

        if lookup_value is not None and lookup_value.isdigit():
            obj = queryset.filter(id=lookup_value).first()

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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_articles(self, request):
        """Get articles - for now returns all articles (can be filtered by author later)."""
        articles = self.queryset.all()
        serializer = self.get_serializer(articles, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='upload-content-image',
            parser_classes=[MultiPartParser, FormParser],
            permission_classes=[permissions.IsAuthenticated])
    def upload_content_image(self, request):
        """Upload an image for use within article content (rich text editor)."""
        image = request.FILES.get('image') or request.FILES.get('upload')
        if not image:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Save image using ArticleImage model (no article association yet)
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import uuid

        ext = image.name.split('.')[-1] if '.' in image.name else 'jpg'
        filename = f"article_content/{uuid.uuid4().hex}.{ext}"
        path = default_storage.save(filename, ContentFile(image.read()))
        url = request.build_absolute_uri(settings.MEDIA_URL + path)

        return Response({'url': url, 'uploaded': True}, status=status.HTTP_201_CREATED)


class ArticleImageViewSet(viewsets.ModelViewSet):
    queryset = ArticleImage.objects.all().order_by('-id')
    serializer_class = ArticleImageSerializer
    parser_classes = [MultiPartParser, FormParser]


class ArticleShareView(APIView):
    def get(self, request, slug):
        if slug.isdigit():
            article = Article.objects.filter(id=slug).first()
            if not article:
                article = get_object_or_404(Article, slug=slug)
        else:
            article = get_object_or_404(Article, slug=slug)

        if settings.DEBUG:
            frontend_url = 'http://localhost:3000'
        else:
            frontend_url = 'https://barakah-economy.com'

        return render(request, 'article/article_share.html', {
            'article': article,
            'frontend_url': frontend_url
        })