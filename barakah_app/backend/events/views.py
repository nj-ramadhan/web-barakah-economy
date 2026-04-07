from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile
from .serializers import EventSerializer, EventRegistrationSerializer
from django_filters.rest_framework import DjangoFilterBackend
from barakah_app.utils import send_status_update_email
import json

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-start_date')
    serializer_class = EventSerializer
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_featured', 'created_by']
    search_fields = ['title', 'description', 'location', 'organizer_name']
    ordering_fields = ['start_date', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'landing', 'register']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def _handle_json_fields(self, request):
        """Helper to parse JSON strings in multipart requests."""
        form_fields = request.data.get('form_fields')
        if isinstance(form_fields, str):
            try:
                if hasattr(request.data, '_mutable'):
                    request.data._mutable = True
                request.data['form_fields'] = json.loads(form_fields)
                if hasattr(request.data, '_mutable'):
                    request.data._mutable = False
            except:
                pass

    def create(self, request, *args, **kwargs):
        self._handle_json_fields(request)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        self._handle_json_fields(request)
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if status is changing to trigger email
        old_status = instance.status
        new_status = request.data.get('status')
        rejection_reason = request.data.get('rejection_reason')
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if new_status and old_status != new_status:
            send_status_update_email(
                instance.created_by, 
                instance.title, 
                new_status, 
                rejection_reason
            )

        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def landing(self, request):
        """Public list for landing page (only approved)."""
        events = self.queryset.filter(status='approved')
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_events(self, request):
        """List events created by current user."""
        events = self.queryset.filter(created_by=request.user)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request, slug=None):
        """Standard/Guest registration for an event."""
        event = self.get_object()
        
        # Extract guest info or user
        user = request.user if request.user.is_authenticated else None
        guest_name = request.data.get('guest_name')
        guest_email = request.data.get('guest_email')
        
        # Extract responses (JSON string if from FormData)
        responses_raw = request.data.get('responses', '{}')
        try:
            responses = json.loads(responses_raw) if isinstance(responses_raw, str) else responses_raw
        except:
            return Response({"error": "Invalid responses format"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Validate required fields
        form_fields = event.form_fields.all()
        errors = {}
        for field in form_fields:
            value = responses.get(str(field.id))
            if field.required and (not value and str(field.id) not in request.FILES):
                errors[field.label] = "Field ini wajib diisi."
        
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Create registration
        registration = EventRegistration.objects.create(
            event=event,
            user=user,
            guest_name=guest_name,
            guest_email=guest_email,
            responses=responses
        )
        
        # 3. Handle File Uploads
        for field in form_fields:
            if field.field_type == 'file' and str(field.id) in request.FILES:
                EventRegistrationFile.objects.create(
                    registration=registration,
                    field=field,
                    file=request.FILES[str(field.id)]
                )
        
        return Response({"message": "Pendaftaran berhasil dikirim! Menunggu tinjauan.", "id": registration.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def participants(self, request, slug=None):
        """Public list of approved participants for this event."""
        event = self.get_object()
        registrations = EventRegistration.objects.filter(event=event, status='approved').select_related('user', 'user__profile')
        
        data = []
        for reg in registrations:
            item = {
                "id": reg.id,
                "created_at": reg.created_at,
            }
            if reg.user:
                item["name"] = reg.user.profile.name_full if hasattr(reg.user, 'profile') and reg.user.profile.name_full else reg.user.username
                item["username"] = reg.user.username
                item["avatar"] = request.build_absolute_uri(reg.user.profile.avatar.url) if hasattr(reg.user, 'profile') and reg.user.profile.avatar else None
            else:
                # Mask email for guests
                email = reg.guest_email or ""
                masked_email = email[:2] + "***" + email[email.find('@'):] if '@' in email else "***"
                item["name"] = reg.guest_name or "Guest"
                item["email_masked"] = masked_email
                item["avatar"] = None
            
            data.append(item)
            
        return Response(data)

class EventRegistrationViewSet(viewsets.ModelViewSet):
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['event', 'status', 'user']

    def get_permissions(self):
        # Registration management only for authenticated users (Staff/Creators)
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        # List only registrations for events owned by user OR if staff
        if request.user.is_staff:
            return super().list(request, *args, **kwargs)
        
        user_events = Event.objects.filter(created_by=request.user)
        queryset = self.queryset.filter(event__in=user_events)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        registration = self.get_object()
        # Verify ownership
        if not request.user.is_staff and registration.event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registration.status = 'approved'
        registration.save()
        
        # Optional: Send email confirmation to registrant
        return Response({"message": "Pendaftaran disetujui."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        registration = self.get_object()
        if not request.user.is_staff and registration.event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registration.status = 'rejected'
        registration.save()
        return Response({"message": "Pendaftaran ditolak."})
