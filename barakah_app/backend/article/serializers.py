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
            return request.build_absolute_uri(obj.path.url)
        return None


class ArticleSerializer(serializers.ModelSerializer):
    images = ArticleImageSerializer(many=True, read_only=True)
    date = serializers.DateField(format="%d %B %Y")

    # SerializerMethodField untuk memastikan URL Icon lengkap (http://domain/media/...)
    floating_icon_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'status', 'date', 'images',
            'floating_url', 'floating_label', 'floating_icon_url'  # Field baru
        ]

    def get_floating_icon_url(self, obj):
        request = self.context.get('request')
        if obj.floating_icon:
            return request.build_absolute_uri(obj.floating_icon.url)
        return None


class ArticleImageUploadSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        allow_empty=False
    )
    title = serializers.CharField(required=False)