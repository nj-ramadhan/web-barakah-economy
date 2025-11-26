from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Article, ArticleImage
from .serializers import ArticleSerializer, ArticleImageSerializer, ArticleImageUploadSerializer


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().order_by('-id')
    serializer_class = ArticleSerializer

    # Fungsi upload multiple images (Local Storage)
    @action(detail=True, methods=['post'], url_path='upload-images', parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        article = self.get_object()
        serializer = ArticleImageUploadSerializer(data=request.data)

        if serializer.is_valid():
            images = serializer.validated_data['images']
            title = serializer.validated_data.get('title')
            saved_files = []

            for img in images:
                # File akan otomatis tersimpan sesuai upload_to di models.py
                obj = ArticleImage.objects.create(
                    article=article,
                    title=title or img.name,
                    path=img
                )
                # Kirim context request agar full_path valid
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