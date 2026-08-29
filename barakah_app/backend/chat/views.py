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
        queryset = ConsultantProfile.objects.filter(is_available=True).exclude(user=self.request.user)
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
        if not user.is_authenticated:
            return ChatSession.objects.none()

        return ChatSession.objects.filter(
            Q(user=user) | 
            Q(consultant=user) | 
            Q(seller=user) | 
            Q(product__seller=user) | 
            Q(order__seller=user)
        ).distinct().select_related('user', 'consultant', 'seller', 'category', 'product', 'order').order_by('-updated_at')



    def create(self, request, *args, **kwargs):
        user = request.user
        session_type = request.data.get('session_type', 'consultant')
        category_id = request.data.get('category')
        consultant_id = request.data.get('consultant')
        seller_id = request.data.get('seller')
        product_id = request.data.get('product')
        order_id = request.data.get('order')
        initial_message = request.data.get('initial_message')

        # 1. MARKETPLACE / STORE CHAT FLOW
        if session_type in ['store', 'order']:
            product = None
            order = None
            seller = None

            if product_id:
                from products.models import Product
                product = Product.objects.filter(id=product_id).first()
                if product and product.seller:
                    seller = product.seller

            if order_id:
                from orders.models import Order
                order = Order.objects.filter(id=order_id).first()
                if order and order.seller:
                    seller = order.seller

            if seller_id and not seller:
                seller = User.objects.filter(id=seller_id).first()

            if not seller:
                # If product or order has no explicit seller, fallback to admin
                seller = User.objects.filter(is_superuser=True).first()

            if seller == user:
                return response.Response({"error": "Anda tidak dapat membuka obrolan dengan toko Anda sendiri"}, status=status.HTTP_400_BAD_REQUEST)

            # Check existing active session between user and seller for this type
            existing_session = ChatSession.objects.filter(
                user=user,
                seller=seller,
                session_type=session_type,
                is_active=True
            )
            if product:
                existing_session = existing_session.filter(product=product)
            if order:
                existing_session = existing_session.filter(order=order)

            session = existing_session.first()
            created = False
            if not session:
                session = ChatSession.objects.create(
                    user=user,
                    seller=seller,
                    product=product,
                    order=order,
                    session_type=session_type,
                    is_ai_active=False  # AI is ALWAYS turned off for store/seller chats
                )
                created = True

            # If initial message or inquiry provided, send it
            if initial_message:
                Message.objects.create(
                    session=session,
                    sender=user,
                    content=initial_message,
                    message_type='text'
                )

            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return response.Response(ChatSessionSerializer(session, context={'request': request}).data, status=status_code)

        # 2. CONSULTANT / SYARIAH EXPERT FLOW
        category = ConsultantCategory.objects.filter(id=category_id).first()
        if not category:
            return response.Response({"error": "Kategori tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        consultant = None
        if consultant_id:
            try:
                consultant = User.objects.get(id=consultant_id)
                # Verify consultant belongs to category
                if not ConsultantProfile.objects.filter(user=consultant, category_id=category_id).exists():
                    if not (consultant.is_staff or consultant.role == 'admin'):
                        return response.Response({"error": "Pakar tidak terdaftar di kategori ini"}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return response.Response({"error": "Pakar tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        if consultant == user:
            return response.Response({"error": "Anda tidak dapat berkonsultasi dengan diri sendiri"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if ACTIVE session already exists for this pair and category
        existing_session = ChatSession.objects.filter(user=user, consultant=consultant, category=category, is_active=True).first()
        
        session = existing_session
        created = False
        if not session:
            session = ChatSession.objects.create(user=user, consultant=consultant, category=category, session_type='consultant')
            created = True
        
        # Auto-send welcome message if exists in category AND has NEVER been sent for this session
        should_send_welcome = False
        if session.category and session.category.welcome_message:
            if not session.last_welcome_sent_at:
                should_send_welcome = True

        if should_send_welcome:
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
        return response.Response(ChatSessionSerializer(session, context={'request': request}).data, status=status_code)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        user = request.user
        sessions = self.get_queryset()
        
        unread_msgs = Message.objects.filter(
            session__in=sessions,
            is_read=False
        ).exclude(sender=user)

        total_unread = unread_msgs.count()
        store_unread = unread_msgs.filter(session__session_type__in=['store', 'order']).count()
        consultant_unread = unread_msgs.filter(session__session_type='consultant').count()

        by_session = {}
        for s in sessions:
            c = unread_msgs.filter(session=s).count()
            if c > 0:
                by_session[str(s.id)] = c

        return response.Response({
            'total_unread': total_unread,
            'store_unread': store_unread,
            'consultant_unread': consultant_unread,
            'by_session': by_session
        })

    @action(detail=True, methods=['post'])
    def close_session(self, request, pk=None):

        session = self.get_object()
        user = request.user
        
        is_owner = session.user == user
        is_expert = session.consultant == user
        is_seller = session.seller == user
        is_admin = user.is_staff or user.role == 'admin'
        
        if not (is_owner or is_expert or is_seller or is_admin):
            return response.Response({"error": "Anda tidak memiliki izin untuk menutup sesi ini."}, status=status.HTTP_403_FORBIDDEN)
            
        session.is_active = False
        session.save()
        
        if is_expert or is_admin:
            closure_msg = "Sesi konsultasi ini telah ditutup oleh pakar. Terima kasih."
            Message.objects.create(
                session=session,
                sender=user,
                content=closure_msg
            )
        
        return response.Response(ChatSessionSerializer(session, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def toggle_ai(self, request, pk=None):
        session = self.get_object()
        # For store/seller chats, do not allow turning on AI
        if session.session_type in ['store', 'order']:
            session.is_ai_active = False
            session.save()
            return response.Response({"is_ai_active": False, "message": "Fitur AI nonaktif untuk obrolan toko"})

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
        
        user = self.request.user
        if not user.is_authenticated:
            return Message.objects.none()

        # Ensure user is strictly part of session (user, consultant, seller, or product/order seller)
        session = ChatSession.objects.filter(
            Q(id=session_id) & (
                Q(user=user) | 
                Q(consultant=user) | 
                Q(seller=user) | 
                Q(product__seller=user) | 
                Q(order__seller=user)
            )
        ).first()
        
        if not session:
            return Message.objects.none()
            
        return Message.objects.filter(session_id=session_id).order_by('-created_at')



    def perform_create(self, serializer):
        session_id = self.request.data.get('session')
        session = ChatSession.objects.get(id=session_id)
        user = self.request.user
        
        # If the sender is the expert/consultant or seller, disable AI
        if session.consultant == user or session.seller == user or session.session_type in ['store', 'order']:
            session.is_ai_active = False
            
        # Update session timestamp
        session.save() 
        
        message_type = self.request.data.get('message_type', 'text')
        metadata = self.request.data.get('metadata', {})
        if isinstance(metadata, str):
            import json
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}

        serializer.save(sender=user, message_type=message_type, metadata=metadata)

        # Trigger AI Response ONLY IF session_type is consultant AND category has AI enabled AND session AI is active
        # NEVER trigger for store or order sessions
        is_user_message = session.user == user
        if session.session_type == 'consultant' and session.category and session.category.is_ai_enabled and session.is_ai_active and is_user_message:
            ai_reply = AIService.get_response(serializer.data['content'], session_id=session.id)
            
            ai_sender = None
            if session.consultant:
                ai_sender = session.consultant
            else:
                ai_sender = User.objects.filter(username='Asisten AI').first()
                if not ai_sender:
                    ai_sender = User.objects.filter(username='admin').first() or User.objects.filter(is_superuser=True).first()
            
            if ai_sender:
                Message.objects.create(
                    session=session,
                    sender=ai_sender,
                    content=ai_reply
                )
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
