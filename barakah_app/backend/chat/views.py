from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message
from .serializers import ConsultantCategorySerializer, ConsultantProfileSerializer, ChatSessionSerializer, MessageSerializer, UserBriefSerializer
from accounts.models import User

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class ConsultantCategoryViewSet(viewsets.ModelViewSet):
    queryset = ConsultantCategory.objects.filter(is_active=True)
    serializer_class = ConsultantCategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class ConsultantProfileViewSet(viewsets.ModelViewSet):
    queryset = ConsultantProfile.objects.all()
    serializer_class = ConsultantProfileSerializer
    permission_classes = [permissions.IsAdminUser]

class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatSession.objects.filter(Q(user=user) | Q(consultant=user)).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        category_id = request.data.get('category')
        user = request.user

        # Find available consultant in this category
        consultant_profile = ConsultantProfile.objects.filter(category_id=category_id, is_available=True).first()
        
        if not consultant_profile:
            # Fallback to admin or first staff if no specific consultant
            admin_user = User.objects.filter(username='admin').first() or User.objects.filter(is_staff=True).first()
            if not admin_user:
                return response.Response({"error": "No consultants available"}, status=status.HTTP_400_BAD_REQUEST)
            consultant = admin_user
        else:
            consultant = consultant_profile.user

        # Check if session already exists for this pair and category
        existing_session = ChatSession.objects.filter(user=user, consultant=consultant, category_id=category_id).first()
        if existing_session:
            return response.Response(ChatSessionSerializer(existing_session).data)

        session = ChatSession.objects.create(user=user, consultant=consultant, category_id=category_id)
        return response.Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)

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

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        session_id = request.data.get('session')
        Message.objects.filter(session_id=session_id).exclude(sender=request.user).update(is_read=True)
        return response.Response({"status": "read"})
