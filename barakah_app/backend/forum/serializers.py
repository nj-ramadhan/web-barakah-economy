from rest_framework import serializers
from .models import Thread, Reply, MentionNotification
from accounts.models import User

class AuthorSerializer(serializers.ModelSerializer):
    is_expert = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'is_expert']
        
    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name if name else obj.username
        
    def get_is_expert(self, obj):
        return hasattr(obj, 'consultant_profile')

class ReplySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    is_expert = serializers.BooleanField(read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Reply
        fields = ['id', 'thread', 'author', 'content', 'parent', 'created_at', 'updated_at', 'is_expert', 'likes_count', 'is_liked', 'children']
        read_only_fields = ['thread', 'author']

    def get_children(self, obj):
        # Recursively get children replies
        if obj.children.exists():
            # In purely recursive trees this can hit the DB hard, 
            # ideally we just grab top level and let the frontend flatten, or limit breadth.
            from .serializers import ReplySerializer
            return ReplySerializer(obj.children.all(), many=True).data
        return []

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        user = self.context.get('request').user if 'request' in self.context else None
        if user and user.is_authenticated:
            return obj.likes.filter(id=user.id).exists()
        return False

class ThreadSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = ['id', 'title', 'slug', 'content', 'author', 'image', 'views', 'created_at', 'updated_at', 'replies_count', 'likes_count', 'is_liked']
        read_only_fields = ['author', 'slug', 'views']

    def get_replies_count(self, obj):
        return obj.replies.count()

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        user = self.context.get('request').user if 'request' in self.context else None
        if user and user.is_authenticated:
            return obj.likes.filter(id=user.id).exists()
        return False

class ThreadDetailSerializer(ThreadSerializer):
    replies = serializers.SerializerMethodField()

    class Meta(ThreadSerializer.Meta):
        fields = ThreadSerializer.Meta.fields + ['replies']

    def get_replies(self, obj):
        # Get only top-level replies, order by is_expert then related created_at
        # Since is_expert is a property and not a database field, sorting in db by it is tricky.
        # Let's fetch the top level, and sort in memory for now.
        replies = obj.replies.filter(parent__isnull=True).select_related('author')
        sorted_replies = sorted(replies, key=lambda r: (not r.is_expert, r.created_at))
        return ReplySerializer(sorted_replies, many=True).data

class MentionNotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = MentionNotification
        fields = ['id', 'recipient', 'sender', 'sender_name', 'thread_slug', 'thread_title', 'snippet', 'is_read', 'created_at']
        read_only_fields = ['id', 'recipient', 'sender', 'sender_name', 'thread_slug', 'thread_title', 'snippet', 'created_at']
