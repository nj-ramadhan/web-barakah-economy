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
    author_username = serializers.CharField(source='author.username', read_only=True)
    thread_title = serializers.CharField(source='thread.title', read_only=True)
    thread_slug = serializers.CharField(source='thread.slug', read_only=True)
    is_expert = serializers.BooleanField(read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Reply
        fields = [
            'id', 'thread', 'thread_title', 'thread_slug', 'author', 'author_username',
            'content', 'parent', 'status', 'is_approved', 'is_spam', 'spam_reason', 'created_at', 'updated_at',
            'is_expert', 'likes_count', 'is_liked', 'children'
        ]
        read_only_fields = ['thread', 'author', 'status', 'is_approved', 'is_spam', 'spam_reason']

    def get_children(self, obj):
        # Recursively get children replies
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        is_admin = user and (user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser)

        qs = obj.children.all()
        if not is_admin:
            qs = qs.filter(is_approved=True, is_spam=False)

        if qs.exists():
            return ReplySerializer(qs, many=True, context=self.context).data
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
    author_username = serializers.CharField(source='author.username', read_only=True)
    replies_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = [
            'id', 'title', 'slug', 'content', 'author', 'author_username',
            'image', 'views', 'status', 'is_approved', 'created_at', 'updated_at',
            'replies_count', 'likes_count', 'is_liked'
        ]
        read_only_fields = ['author', 'slug', 'views', 'status', 'is_approved']

    def get_replies_count(self, obj):
        request = self.context.get('request')
        if request and (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
            return obj.replies.count()
        return obj.replies.filter(is_approved=True).count()

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
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        is_admin = user and (user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser)

        replies = obj.replies.filter(parent__isnull=True).select_related('author')
        if not is_admin:
            replies = replies.filter(is_approved=True, is_spam=False)
        sorted_replies = sorted(replies, key=lambda r: (not r.is_expert, r.created_at))
        return ReplySerializer(sorted_replies, many=True, context=self.context).data

class MentionNotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = MentionNotification
        fields = ['id', 'recipient', 'sender', 'sender_name', 'thread_slug', 'thread_title', 'snippet', 'is_read', 'created_at']
        read_only_fields = ['id', 'recipient', 'sender', 'sender_name', 'thread_slug', 'thread_title', 'snippet', 'created_at']
