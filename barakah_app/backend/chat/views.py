from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message, AISettings
from .serializers import (
    ConsultantCategorySerializer, ConsultantProfileSerializer, 
    ChatSessionSerializer, MessageSerializer, UserBriefSerializer,
    AISettingsSerializer
)
from .ai_service import AIService
from accounts.models import User

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
        if existing_session:
            return response.Response(ChatSessionSerializer(existing_session).data)

        session = ChatSession.objects.create(user=user, consultant=consultant, category=category)
        
        # Auto-send welcome message if exists in category
        if session.category and session.category.welcome_message:
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

        return response.Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)

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
