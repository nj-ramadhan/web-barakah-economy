from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
import re

from accounts.models import User
from .models import Thread, Reply, MentionNotification
from .serializers import ThreadSerializer, ThreadDetailSerializer, ReplySerializer, MentionNotificationSerializer
from .permissions import IsAuthorOrAdminOrReadOnly

def process_mentions(content, sender, thread_slug, thread_title):
    usernames = re.findall(r'@(\w+)', content)
    usernames = list(set(usernames))
    if usernames:
        users = User.objects.filter(username__in=usernames)
        for user in users:
            if user != sender:
                MentionNotification.objects.create(
                    recipient=user,
                    sender=sender,
                    thread_slug=thread_slug,
                    thread_title=thread_title,
                    snippet=content[:100] + '...' if len(content) > 100 else content
                )

class ThreadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrAdminOrReadOnly]
    lookup_field = 'slug'
    
    def get_queryset(self):
        return Thread.objects.all()

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return ThreadDetailSerializer
        return ThreadSerializer

    def perform_create(self, serializer):
        instance = serializer.save(author=self.request.user)
        process_mentions(instance.content, self.request.user, instance.slug, instance.title)

    def perform_update(self, serializer):
        instance = serializer.save()
        process_mentions(instance.content, self.request.user, instance.slug, instance.title)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class ReplyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrAdminOrReadOnly]
    serializer_class = ReplySerializer
    
    def get_queryset(self):
        return Reply.objects.all()

    def perform_create(self, serializer):
        thread_id = self.request.data.get('thread')
        parent_id = self.request.data.get('parent')
        
        thread = get_object_or_404(Thread, id=thread_id)
        parent = None
        if parent_id:
            parent = get_object_or_404(Reply, id=parent_id)
            
        instance = serializer.save(author=self.request.user, thread=thread, parent=parent)
        process_mentions(instance.content, self.request.user, thread.slug, thread.title)

    def perform_update(self, serializer):
        instance = serializer.save()
        process_mentions(instance.content, self.request.user, instance.thread.slug, instance.thread.title)

class MentionNotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MentionNotificationSerializer
    
    def get_queryset(self):
        return MentionNotification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})

class UserSearchAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        q = request.query_params.get('q', '')
        if not q:
            return Response([])
        users = User.objects.filter(
            Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q)
        )[:5]
        data = [{'id': u.id, 'username': u.username, 'name': f"{u.first_name} {u.last_name}".strip() or u.username} for u in users]
        return Response(data)
