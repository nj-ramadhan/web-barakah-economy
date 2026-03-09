# reviews/serializers.py
from rest_framework import serializers
from .models import Review

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = Review
        fields = ['id', 'user', 'username', 'product', 'course', 'rating', 'comment', 'image', 'created_at']
        read_only_fields = ['user']