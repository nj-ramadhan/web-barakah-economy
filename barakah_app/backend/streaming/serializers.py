from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StreamingSettings, StreamingRecording, StreamingChat, StreamingLike

User = get_user_model()

class StreamingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreamingSettings
        fields = ('id', 'is_live', 'title', 'description', 'stream_key', 'latency_mode', 'updated_at')
        read_only_fields = ('id', 'stream_key', 'updated_at')

class StreamingRecordingSerializer(serializers.ModelSerializer):
    formatted_size = serializers.SerializerMethodField()

    class Meta:
        model = StreamingRecording
        fields = ('id', 'title', 'file_name', 'file_size', 'formatted_size', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_formatted_size(self, obj):
        # Format size in Megabytes
        size_in_mb = obj.file_size / (1024 * 1024)
        return f"{size_in_mb:.2f} MB"

class StreamingUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name')

    def get_full_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.name_full if (profile and profile.name_full) else obj.username

class StreamingChatSerializer(serializers.ModelSerializer):
    user = StreamingUserSerializer(read_only=True)

    class Meta:
        model = StreamingChat
        fields = ('id', 'user', 'message', 'created_at')
        read_only_fields = ('id', 'created_at')
