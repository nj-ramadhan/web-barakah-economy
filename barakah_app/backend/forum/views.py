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
from .permissions import IsAuthorOrAdminOrReadOnly, IsAdminUserOrRole
from .spam_detector import check_spam

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
        user = self.request.user
        is_admin = user.is_authenticated and (user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser)

        if is_admin:
            qs = Thread.objects.all().select_related('author')
            status_param = self.request.query_params.get('status')
            if status_param in ['pending', 'approved', 'rejected']:
                qs = qs.filter(status=status_param)
            search_param = self.request.query_params.get('search')
            if search_param:
                qs = qs.filter(
                    Q(title__icontains=search_param) |
                    Q(content__icontains=search_param) |
                    Q(author__username__icontains=search_param)
                )
            return qs

        if user.is_authenticated:
            return Thread.objects.filter(Q(is_approved=True) | Q(author=user)).select_related('author')
        return Thread.objects.filter(is_approved=True).select_related('author')

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return ThreadDetailSerializer
        return ThreadSerializer

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser
        if is_admin:
            instance = serializer.save(author=user, status='approved', is_approved=True)
        else:
            instance = serializer.save(author=user, status='pending', is_approved=False)
        process_mentions(instance.content, user, instance.slug, instance.title)

    def perform_update(self, serializer):
        instance = serializer.save()
        process_mentions(instance.content, self.request.user, instance.slug, instance.title)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def approve(self, request, slug=None):
        thread = self.get_object()
        thread.status = 'approved'
        thread.is_approved = True
        thread.save(update_fields=['status', 'is_approved'])
        return Response({'status': 'approved', 'message': f'Diskusi "{thread.title}" berhasil disetujui.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def reject(self, request, slug=None):
        thread = self.get_object()
        thread.status = 'rejected'
        thread.is_approved = False
        thread.save(update_fields=['status', 'is_approved'])
        return Response({'status': 'rejected', 'message': f'Diskusi "{thread.title}" berhasil ditolak.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_approve(self, request):
        ids = request.data.get('ids', [])
        slugs = request.data.get('slugs', [])
        if not ids and not slugs:
            return Response({'error': 'Tidak ada thread yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Thread.objects.filter(Q(id__in=ids) | Q(slug__in=slugs))
        count = qs.update(status='approved', is_approved=True)
        return Response({'status': 'success', 'updated_count': count, 'message': f'{count} diskusi berhasil disetujui.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_reject(self, request):
        ids = request.data.get('ids', [])
        slugs = request.data.get('slugs', [])
        if not ids and not slugs:
            return Response({'error': 'Tidak ada thread yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Thread.objects.filter(Q(id__in=ids) | Q(slug__in=slugs))
        count = qs.update(status='rejected', is_approved=False)
        return Response({'status': 'success', 'updated_count': count, 'message': f'{count} diskusi berhasil ditolak.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        slugs = request.data.get('slugs', [])
        if not ids and not slugs:
            return Response({'error': 'Tidak ada thread yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Thread.objects.filter(Q(id__in=ids) | Q(slug__in=slugs))
        count = qs.count()
        qs.delete()
        return Response({'status': 'success', 'deleted_count': count, 'message': f'{count} diskusi berhasil dihapus massal.'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        thread = self.get_object()
        user = request.user
        if thread.likes.filter(id=user.id).exists():
            thread.likes.remove(user)
            liked = False
        else:
            thread.likes.add(user)
            liked = True
        return Response({
            'status': 'success',
            'liked': liked,
            'likes_count': thread.likes.count()
        })

class ReplyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrAdminOrReadOnly]
    serializer_class = ReplySerializer
    
    def get_queryset(self):
        user = self.request.user
        is_admin = user.is_authenticated and (user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser)

        if is_admin:
            qs = Reply.objects.all().select_related('author', 'thread')
            status_param = self.request.query_params.get('status')
            if status_param in ['pending', 'approved', 'rejected', 'spam']:
                qs = qs.filter(status=status_param)
            
            is_spam_param = self.request.query_params.get('is_spam')
            if is_spam_param in ['true', '1']:
                qs = qs.filter(is_spam=True)

            thread_slug = self.request.query_params.get('thread_slug')
            if thread_slug:
                qs = qs.filter(thread__slug=thread_slug)
            search_param = self.request.query_params.get('search')
            if search_param:
                qs = qs.filter(
                    Q(content__icontains=search_param) |
                    Q(author__username__icontains=search_param) |
                    Q(thread__title__icontains=search_param) |
                    Q(spam_reason__icontains=search_param)
                )
            return qs

        return Reply.objects.filter(is_approved=True, is_spam=False).select_related('author', 'thread')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        if data.get('is_spam'):
            data['message'] = 'Balasan Anda terdeteksi mengandung spam/promosi dan disembunyikan otomatis.'
        else:
            data['message'] = 'Balasan berhasil dikirim.'
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        thread_id = self.request.data.get('thread')
        parent_id = self.request.data.get('parent')
        
        thread = get_object_or_404(Thread, id=thread_id)
        parent = None
        if parent_id:
            parent = get_object_or_404(Reply, id=parent_id)
            
        user = self.request.user
        is_admin = user.is_staff or getattr(user, 'role', '') == 'admin' or user.is_superuser
        raw_content = serializer.validated_data.get('content', '') or self.request.data.get('content', '')

        if is_admin:
            instance = serializer.save(author=user, thread=thread, parent=parent, status='approved', is_approved=True, is_spam=False)
        else:
            is_spam, reason = check_spam(raw_content, user=user, thread=thread)
            if is_spam:
                instance = serializer.save(
                    author=user,
                    thread=thread,
                    parent=parent,
                    status='spam',
                    is_approved=False,
                    is_spam=True,
                    spam_reason=reason
                )
            else:
                instance = serializer.save(
                    author=user,
                    thread=thread,
                    parent=parent,
                    status='approved',
                    is_approved=True,
                    is_spam=False
                )

        if instance.is_approved and not instance.is_spam:
            process_mentions(instance.content, user, thread.slug, thread.title)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_approved and not instance.is_spam:
            process_mentions(instance.content, self.request.user, instance.thread.slug, instance.thread.title)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def approve(self, request, pk=None):
        reply = self.get_object()
        reply.status = 'approved'
        reply.is_approved = True
        reply.save(update_fields=['status', 'is_approved'])
        return Response({'status': 'approved', 'message': 'Balasan berhasil disetujui.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def reject(self, request, pk=None):
        reply = self.get_object()
        reply.status = 'rejected'
        reply.is_approved = False
        reply.save(update_fields=['status', 'is_approved'])
        return Response({'status': 'rejected', 'message': 'Balasan berhasil ditolak.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_approve(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Tidak ada balasan yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        count = Reply.objects.filter(id__in=ids).update(status='approved', is_approved=True)
        return Response({'status': 'success', 'updated_count': count, 'message': f'{count} balasan berhasil disetujui.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_reject(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Tidak ada balasan yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        count = Reply.objects.filter(id__in=ids).update(status='rejected', is_approved=False)
        return Response({'status': 'success', 'updated_count': count, 'message': f'{count} balasan berhasil ditolak.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOrRole])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'Tidak ada balasan yang dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Reply.objects.filter(id__in=ids)
        count = qs.count()
        qs.delete()
        return Response({'status': 'success', 'deleted_count': count, 'message': f'{count} balasan berhasil dihapus massal.'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        reply = self.get_object()
        user = request.user
        if reply.likes.filter(id=user.id).exists():
            reply.likes.remove(user)
            liked = False
        else:
            reply.likes.add(user)
            liked = True
        return Response({
            'status': 'success',
            'liked': liked,
            'likes_count': reply.likes.count()
        })

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
