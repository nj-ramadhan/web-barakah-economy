from rest_framework import serializers
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message, AISettings
from accounts.models import User

class AISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = '__all__'

class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class ConsultantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultantCategory
        fields = ['id', 'name', 'icon', 'is_active', 'is_ai_enabled', 'welcome_message']

class ConsultantProfileSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = ConsultantProfile
        fields = ['id', 'user', 'user_details', 'category', 'category_name', 'is_available', 'bio']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    
    class Meta:
        model = Message
        fields = ['id', 'session', 'sender', 'sender_name', 'content', 'attachment', 'is_read', 'created_at']
        read_only_fields = ['sender', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    consultant_details = UserBriefSerializer(source='consultant', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    category_welcome_message = serializers.ReadOnlyField(source='category.welcome_message')
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'user', 'user_details', 'consultant', 'consultant_details', 'category', 'category_name', 'category_welcome_message', 'created_at', 'updated_at', 'last_message']

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return MessageSerializer(last).data
        return None
