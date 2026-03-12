from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message, AISettings, ChatCommand, ConsultationReview, GeneralFeedback
from .serializers import (
    ConsultantCategorySerializer, ConsultantProfileSerializer, 
    ChatSessionSerializer, MessageSerializer, UserBriefSerializer,
    AISettingsSerializer, ChatCommandSerializer, ConsultationReviewSerializer,
    GeneralFeedbackSerializer
)
from .ai_service import AIService
from accounts.models import User
from django.utils import timezone
from datetime import timedelta

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class ConsultantCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ConsultantCategorySerializer
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return ConsultantCategory.objects.all()
        return ConsultantCategory.objects.filter(is_active=True)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class ConsultantProfileViewSet(viewsets.ModelViewSet):
    queryset = ConsultantProfile.objects.all()
    serializer_class = ConsultantProfileSerializer
    
    def get_queryset(self):
        queryset = ConsultantProfile.objects.filter(is_available=True)
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class ConsultationReviewViewSet(viewsets.ModelViewSet):
    queryset = ConsultationReview.objects.all()
    serializer_class = ConsultationReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        session_id = self.request.data.get('session')
        session = ChatSession.objects.get(id=session_id)
        
        # Only the user of the session can submit review
        if session.user != self.request.user:
            raise permissions.PermissionDenied("Anda tidak dapat memberikan review untuk sesi ini.")
            
        serializer.save()

class GeneralFeedbackViewSet(viewsets.ModelViewSet):
    queryset = GeneralFeedback.objects.all().order_by('-created_at')
    serializer_class = GeneralFeedbackSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatSession.objects.filter(Q(user=user) | Q(consultant=user)).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        category_id = request.data.get('category')
        consultant_id = request.data.get('consultant') # Explicit consultant choice
        user = request.user

        category = ConsultantCategory.objects.filter(id=category_id).first()
        if not category:
            return response.Response({"error": "Kategori tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        consultant = None
        if consultant_id:
            try:
                consultant = User.objects.get(id=consultant_id)
                # Verify consultant belongs to category
                if not ConsultantProfile.objects.filter(user=consultant, category_id=category_id).exists():
                    # For safety, allow staff/admin to consult anywhere
                    if not (consultant.is_staff or consultant.role == 'admin'):
                        return response.Response({"error": "Pakar tidak terdaftar di kategori ini"}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return response.Response({"error": "Pakar tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        # Check if session already exists for this pair and category
        existing_session = ChatSession.objects.filter(user=user, consultant=consultant, category=category).first()
        
        session = existing_session
        created = False
        if not session:
            session = ChatSession.objects.create(user=user, consultant=consultant, category=category)
            created = True
        
        # Auto-send welcome message if exists in category AND (is new OR was sent > 24h ago)
        should_send_welcome = False
        if session.category and session.category.welcome_message:
            now = timezone.now()
            if not session.last_welcome_sent_at or session.last_welcome_sent_at < now - timedelta(days=1):
                should_send_welcome = True

        if should_send_welcome:
            # Use consultant as sender if exists, otherwise admin/system
            sender = consultant
            if not sender:
                sender = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_staff=True).first()
            
            if sender:
                Message.objects.create(
                    session=session,
                    sender=sender,
                    content=session.category.welcome_message
                )
                session.last_welcome_sent_at = timezone.now()
                session.save()

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return response.Response(ChatSessionSerializer(session).data, status=status_code)

    @action(detail=True, methods=['post'])
    def close_session(self, request, pk=None):
        session = self.get_object()
        user = request.user
        
        # Only owner, expert or admin can close
        is_owner = session.user == user
        is_expert = session.consultant == user
        is_admin = user.is_staff or user.role == 'admin'
        
        if not (is_owner or is_expert or is_admin):
            return response.Response({"error": "Anda tidak memiliki izin untuk menutup sesi ini."}, status=status.HTTP_403_FORBIDDEN)
            
        session.is_active = False
        session.save()
        
        # Only send closure message if CLOSED BY EXPERT/ADMIN
        if is_expert or is_admin:
            closure_msg = "Sesi konsultasi ini telah ditutup oleh pakar. Terima kasih."
            Message.objects.create(
                session=session,
                sender=user,
                content=closure_msg
            )
        
        return response.Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def toggle_ai(self, request, pk=None):
        session = self.get_object()
        is_active = request.data.get('is_ai_active', not session.is_ai_active)
        session.is_ai_active = is_active
        session.save()
        return response.Response({"is_ai_active": session.is_ai_active})

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        session_id = self.request.query_params.get('session')
        if not session_id:
            return Message.objects.none()
        
        # Ensure user part of session
        session = ChatSession.objects.filter(
            Q(id=session_id) & (Q(user=self.request.user) | Q(consultant=self.request.user))
        ).first()
        
        if not session:
            return Message.objects.none()
            
        return Message.objects.filter(session_id=session_id).order_by('-created_at')

    def perform_create(self, serializer):
        session_id = self.request.data.get('session')
        session = ChatSession.objects.get(id=session_id)
        
        # Update session timestamp for sorting in inbox
        session.save() 
        
        serializer.save(sender=self.request.user)

        # Trigger AI Response if session category has AI enabled AND session AI is active
        if session.category and session.category.is_ai_enabled and session.is_ai_active:
            ai_reply = AIService.get_response(serializer.data['content'], session_id=session.id)
            
            ai_sender = None
            if session.consultant:
                ai_sender = session.consultant
            else:
                # Try to find a dedicated 'Asisten AI' user
                ai_sender = User.objects.filter(username='Asisten AI').first()
                if not ai_sender:
                    # Fallback to admin user
                    ai_sender = User.objects.filter(username='admin').first() or User.objects.filter(is_superuser=True).first()
            
            if ai_sender:
                Message.objects.create(
                    session=session,
                    sender=ai_sender,
                    content=ai_reply
                )
                # Update session timestamp
                session.save()

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        session_id = request.data.get('session')
        Message.objects.filter(session_id=session_id).exclude(sender=request.user).update(is_read=True)
        return response.Response({"status": "read"})

class AISettingsViewSet(viewsets.ModelViewSet):
    queryset = AISettings.objects.all()
    serializer_class = AISettingsSerializer
    permission_classes = [permissions.IsAdminUser]

    def list(self, request, *args, **kwargs):
        # Always return the first (and only) settings object
        settings, _ = AISettings.objects.get_or_create(id=1)
        serializer = self.get_serializer(settings)
        return response.Response(serializer.data)

    @action(detail=False, methods=['patch', 'put'])
    def update_settings(self, request):
        settings, _ = AISettings.objects.get_or_create(id=1)
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChatCommandViewSet(viewsets.ModelViewSet):
    serializer_class = ChatCommandSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ChatCommand.objects.filter(is_active=True)
        
        # Filter based on role
        if user.is_staff or user.role == 'admin':
            return queryset # Admins see all active commands
        
        # Check if user is expert
        is_expert = ConsultantProfile.objects.filter(user=user).exists()
        if is_expert:
            return queryset.filter(Q(role='public') | Q(role='expert'))
            
        return queryset.filter(role='public')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
