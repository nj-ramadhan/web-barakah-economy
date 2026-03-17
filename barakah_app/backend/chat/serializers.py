from rest_framework import serializers
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message, AISettings, ChatCommand, ConsultationReview, GeneralFeedback
from accounts.models import User

class AISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = '__all__'

class UserBriefSerializer(serializers.ModelSerializer):
    picture = serializers.ImageField(source='profile.picture', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'is_staff', 'picture']

class ConsultantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultantCategory
        fields = ['id', 'name', 'icon', 'is_active', 'is_ai_enabled', 'welcome_message', 'ai_system_prompt', 'knowledge_base']

class ConsultantProfileSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = ConsultantProfile
        fields = ['id', 'user', 'user_details', 'category', 'category_name', 'is_available', 'bio']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    sender_picture = serializers.ImageField(source='sender.profile.picture', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'session', 'sender', 'sender_name', 'sender_picture', 'content', 'attachment', 'is_read', 'created_at']
        read_only_fields = ['sender', 'created_at']

class ConsultationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationReview
        fields = '__all__'

class GeneralFeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = GeneralFeedback
        fields = ['id', 'user', 'user_name', 'content', 'urgent', 'created_at']
        read_only_fields = ['user', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    consultant_details = UserBriefSerializer(source='consultant', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_welcome_message = serializers.ReadOnlyField(source='category.welcome_message')
    ai_system_prompt = serializers.ReadOnlyField(source='category.ai_system_prompt')
    is_ai_active = serializers.BooleanField(read_only=True)
    last_message = serializers.SerializerMethodField()
    review = ConsultationReviewSerializer(read_only=True)

    class Meta:
        model = ChatSession
        fields = '__all__'

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return MessageSerializer(last).data
        return None

class ChatCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatCommand
        fields = '__all__'
