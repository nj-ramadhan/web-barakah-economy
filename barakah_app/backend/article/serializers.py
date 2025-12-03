from rest_framework import serializers
from .models import Article, ArticleImage

class ArticleImageSerializer(serializers.ModelSerializer):
    full_path = serializers.SerializerMethodField()

    class Meta:
        model = ArticleImage
        fields = ['id', 'title', 'path', 'full_path']

    def get_full_path(self, obj):
        request = self.context.get('request')
        if obj.path:
            # Ini akan membuat URL lengkap: http://domain.com/media/...
            return request.build_absolute_uri(obj.path.url)
        return None

class ArticleSerializer(serializers.ModelSerializer):
    images = ArticleImageSerializer(many=True, read_only=True)
    date = serializers.DateField(format="%d %B %Y")

    class Meta:
        model = Article
        fields = ['id', 'title', 'content', 'status', 'date', 'images']

class ArticleImageUploadSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        allow_empty=False
    )
    title = serializers.CharField(required=False)