from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse
import csv
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile
from .serializers import EventSerializer, EventRegistrationSerializer
from django_filters.rest_framework import DjangoFilterBackend
from barakah_app.utils import send_status_update_email
import json
from django.utils import timezone
from accounts import whatsapp_service
import os
import re

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('-start_date')
    serializer_class = EventSerializer
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_featured', 'created_by']
    search_fields = ['title', 'description', 'location', 'organizer_name']
    ordering_fields = ['start_date', 'created_at']

    def _auto_complete_expired_events(self):
        """
        Check for approved/ongoing events that have passed their end_date 
        and update them to 'completed'.
        """
        now = timezone.now()
        expired_events = Event.objects.filter(
            status__in=['approved', 'ongoing'],
            end_date__lt=now
        )
        for event in expired_events:
            event.status = 'completed'
            event.save() # This triggers the documentation signal

    def get_permissions(self):
        # Public actions
        if self.action in ['list', 'retrieve', 'landing', 'register', 'participants']:
            return [permissions.AllowAny()]
        
        # CRUD / Management actions
        # User must be authenticated
        if not self.request.user or not self.request.user.is_authenticated:
            return [permissions.IsAuthenticated()]
            
        # Check for menu access 'admin_events' or role 'admin'
        if self.request.user.has_menu_access('admin_events'):
            return [permissions.IsAuthenticated()]
            
        # Deny others
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        self._auto_complete_expired_events()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._auto_complete_expired_events()
        return super().retrieve(request, *args, **kwargs)

    def _get_parsed_data(self, request):
        """Returns a dict from request.data with JSON fields correctly parsed."""
        # Start with a shallow copy of request.data
        # If it's a QueryDict (multipart), .dict() gives us a mutable dict
        if hasattr(request.data, 'dict'):
            data = request.data.dict()
        else:
            # For JSON requests, it's already a dict
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Parse form_fields if it's a JSON string
        form_fields = data.get('form_fields')
        if form_fields and isinstance(form_fields, str):
            try:
                # Basic check if it looks like JSON
                stripped = form_fields.strip()
                if stripped.startswith('[') or stripped.startswith('{'):
                    data['form_fields'] = json.loads(stripped)
            except Exception as e:
                print(f"Error parsing form_fields JSON: {e}")
        
        return data

    def create(self, request, *args, **kwargs):
        data = self._get_parsed_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        data = self._get_parsed_data(request)
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if status is changing to trigger email
        old_status = instance.status
        new_status = data.get('status')
        rejection_reason = data.get('rejection_reason')
        serializer = self.get_serializer(instance, data=data, partial=partial)
        
        # If event is already approved, editing it should not revert to pending
        if old_status == 'approved' and not request.user.is_staff:
            data['status'] = 'approved'
            
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
        self._auto_complete_expired_events()
        # Include both approved and completed events in the public list
        events = self.queryset.filter(status__in=['approved', 'completed'])
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_events(self, request):
        """List events created by current user."""
        events = self.queryset.filter(created_by=request.user)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, slug=None):
        """Authenticated registration for an event."""
        event = self.get_object()
        user = request.user
        
        # Check if already registered
        if EventRegistration.objects.filter(event=event, user=user).exists():
            return Response({"error": "Anda sudah terdaftar di event ini."}, status=status.HTTP_400_BAD_REQUEST)

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
            
        # 2. Payment Handling
        payment_proof = request.FILES.get('payment_proof')
        payment_amount = request.data.get('payment_amount', 0)
        
        if event.price_type != 'free' and not payment_proof:
            return Response({"error": "Bukti pembayaran wajib diunggah untuk event berbayar."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Create registration
        # Status defaults to 'pending' as defined in model
        registration = EventRegistration.objects.create(
            event=event,
            user=user,
            responses=responses,
            payment_proof=payment_proof,
            payment_amount=payment_amount,
            status='approved' # Force auto-approve
        )
        
        # 4. Handle File Uploads for dynamic fields
        for field in form_fields:
            if field.field_type == 'file' and str(field.id) in request.FILES:
                EventRegistrationFile.objects.create(
                    registration=registration,
                    field=field,
                    file=request.FILES[str(field.id)]
                )
        
        # 5. Automated Notifications
        try:
            self._send_registration_notifications(registration)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send notifications for registration {registration.id}: {e}")
        
        return Response({"message": "Pendaftaran berhasil dikirim! Silakan tunggu verifikasi admin.", "id": registration.id}, status=status.HTTP_201_CREATED)

    def _send_registration_notifications(self, registration):
        """Helper to send Email and WhatsApp notifications on registration."""
        responses = registration.responses
        form_fields = registration.event.form_fields.all()
        
        email = registration.guest_email
        phone = None
        
        # If user is authenticated, use their data as fallback
        if registration.user:
            if not email:
                email = registration.user.email
            if hasattr(registration.user, 'phone'):
                phone = registration.user.phone

        # Scan dynamic form fields for contact info (overrides account data if present in form)
        for field in form_fields:
            field_id = str(field.id)
            value = responses.get(field_id)
            if not value or not isinstance(value, str):
                continue
            
            label = field.label.lower()
            if 'email' in label:
                email = value
            if any(kw in label for kw in ['wa', 'whatsapp', 'hp', 'telepon', 'phone', 'handphone']):
                phone = value

        # Send WhatsApp
        if phone:
            formatted_phone = self._format_phone_number(phone)
            wa_message = (
                f"Halo! Terima kasih telah mendaftar di event: *{registration.event.title}*.\n\n"
                f"Pendaftaran Anda telah berhasil dikonfirmasi secara otomatis.\n"
                f"Sampai jumpa di lokasi acara!\n\n"
                f"Salam,\nBarakah Economy"
            )
            whatsapp_service.send_message(formatted_phone, wa_message)

        # Send Email
        if email:
            subject = f"Konfirmasi Pendaftaran Event: {registration.event.title}"
            message = (
                f"Assalamu'alaikum,\n\n"
                f"Terima kasih telah mendaftar di event '{registration.event.title}'.\n"
                f"Pendaftaran Anda telah berhasil dikonfirmasi secara otomatis.\n\n"
                f"Detail Event:\n"
                f"- Judul: {registration.event.title}\n"
                f"- Lokasi: {registration.event.location}\n"
                f"- Waktu: {registration.event.start_date.strftime('%d %b %Y %H:%M')}\n\n"
                f"Terima kasih,\nTim Barakah Economy"
            )
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=True
            )

    def _format_phone_number(self, phone):
        if not phone: return None
        # Convert to string and strip spaces
        phone = str(phone).strip()
        
        # Remove any non-digits (including +)
        digits = ''.join(filter(str.isdigit, phone))
        
        if digits.startswith('0'): 
            digits = '62' + digits[1:]
        elif digits.startswith('8'): 
            digits = '62' + digits
        
        # Return with + prefix as requested
        return f"+{digits}"

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def blast_whatsapp(self, request, slug=None):
        """Blast WhatsApp messages to all participants of an event."""
        event = self.get_object()
        
        # Check if user is the organizer or admin
        if not (request.user.is_staff or event.created_by == request.user):
            return Response({"error": "Hanya admin atau penyelenggara yang bisa mengirim blast."}, status=status.HTTP_403_FORBIDDEN)
            
        custom_message = request.data.get('message')
        if not custom_message:
            return Response({"error": "Pesan tidak boleh kosong."}, status=status.HTTP_400_BAD_REQUEST)
            
        registrations_ids = request.data.get('registration_ids')
        if registrations_ids:
            registrations = EventRegistration.objects.filter(id__in=registrations_ids, event=event)
        else:
            registrations = EventRegistration.objects.filter(event=event, status='approved')
        
        phone_list = []
        placeholder_data = []
        
        for reg in registrations:
            # Search for contact info
            _, phone, detected_name = self._detect_contact_info_standalone(reg)
            if phone:
                formatted_phone = self._format_phone_number(phone)
                if formatted_phone:
                    phone_list.append(formatted_phone)
                    placeholder_data.append({'name': detected_name, 'event': event.title})
        
        if not phone_list:
            return Response({"error": "Tidak ada nomor WhatsApp peserta yang terdeteksi."}, status=status.HTTP_404_NOT_FOUND)
            
        # Use blast_messages from whatsapp_service
        result = whatsapp_service.blast_messages(phone_list, custom_message, placeholder_data)
        
        return Response({
            "message": f"Blast selesai dikirim ke {result['success']} peserta.",
            "details": result
        })

    def _detect_contact_info_standalone(self, registration):
        """Standalone helper for detecting contact info from a registration."""
        responses = registration.responses
        form_fields = registration.event.form_fields.all()
        
        # Initial fallbacks
        email = registration.guest_email
        phone = None
        name = registration.guest_name
        
        is_profile_complete = False
        
        if registration.user:
            if not email: email = registration.user.email
            profile = getattr(registration.user, 'profile', None)
            if profile and profile.name_full:
                name = profile.name_full
                is_profile_complete = True
            elif not name:
                name = registration.user.username
            
            if hasattr(registration.user, 'phone'): 
                phone = registration.user.phone
                if phone: is_profile_complete = True

        # Scan form fields for marketing data
        # If profile is already comprehensive, we only override if form data is likely more specific
        for field in form_fields:
            field_id = str(field.id)
            value = responses.get(field_id)
            if not value or not isinstance(value, (str, int)): continue
            
            label = field.label.lower()
            
            # Email detection
            if 'email' in label: 
                # Always take from form if provided explicitly
                email = str(value)
            
            # Phone detection
            if any(kw in label for kw in ['wa', 'whatsapp', 'nomor hp', 'telepon', 'phone', 'telepon', 'handphone']):
                # Priority for form phone for specific event contact
                phone = str(value)
            
            # Name detection - only override if profile is not "lengkap" or if it matches "Nama Lengkap" keyword
            if any(kw in label for kw in ['nama lengkap', 'nama pendaftar', 'fullName']):
                if not is_profile_complete or 'lengkap' in label:
                    name = str(value)
            elif not name and 'nama' in label:
                name = str(value)
                
        return email, phone, name

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_documentation_images(self, request, slug=None):
        """Upload post-event documentation images."""
        event = self.get_object()
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        images = request.FILES.getlist('images')
        if not images:
            return Response({"error": "No images provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        from .models import EventDocumentationImage
        for img in images:
            EventDocumentationImage.objects.create(event=event, image=img)
            
        return Response({"message": f"Successfully uploaded {len(images)} images."})

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def delete_documentation_image(self, request, slug=None):
        """Delete a documentation image."""
        event = self.get_object()
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        image_id = request.data.get('image_id')
        from .models import EventDocumentationImage
        try:
            img = EventDocumentationImage.objects.get(id=image_id, event=event)
            img.delete()
            return Response({"message": "Image deleted."})
        except EventDocumentationImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def participants(self, request, slug=None):
        """Public list of approved participants for this event."""
        event = self.get_object()
        # Remove status='approved' filter to show everyone who registered
        registrations = EventRegistration.objects.filter(event=event)
        
        data = []
        for reg in registrations:
            name = ""
            if reg.user:
                # Try to get full name first
                profile = getattr(reg.user, 'profile', None)
                if profile and profile.name_full:
                    name = profile.name_full
                else:
                    name = reg.user.username
            else:
                name = reg.guest_name or "Tamu"
                
            data.append({
                "id": reg.id,
                "name": name,
                "status": reg.status,
                "created_at": reg.created_at,
            })
            
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def export_registrations(self, request, slug=None):
        """Export all registrations for this event as a CSV file."""
        event = self.get_object()
        
        # Verify ownership
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registrations = EventRegistration.objects.filter(event=event).select_related('user', 'user__profile')
        form_fields = event.form_fields.all()
        
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="participants_{event.slug}.csv"'
        
        writer = csv.writer(response)
        
        # CSV Header
        header = ['Waktu Daftar', 'ID Peserta', 'Nama', 'Email', 'Status']
        for field in form_fields:
            header.append(field.label)
        writer.writerow(header)
        
        # CSV Data
        for reg in registrations:
            row = []
            # Registration Time
            row.append(reg.created_at.strftime('%Y-%m-%d %H:%M:%S'))

            # ID Peserta
            row.append(reg.user.id if reg.user else "-")
            
            # Name
            name = reg.guest_name
            if reg.user:
                if hasattr(reg.user, 'profile') and reg.user.profile.name_full:
                    name = reg.user.profile.name_full
                else:
                    name = reg.user.username
            row.append(name or "Guest")
            
            # Email
            row.append(reg.guest_email or (reg.user.email if reg.user else "-"))
            
            # Status
            row.append(reg.status)
            
            # Custom Fields
            for field in form_fields:
                value = reg.responses.get(str(field.id), "")
                if isinstance(value, list):
                    value = ", ".join(map(str, value))
                row.append(value)
                
            writer.writerow(row)
            
        return response

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
        
        # Send email confirmation to registrant
        try:
            recipient_email = registration.guest_email if not registration.user else registration.user.email
            recipient_name = registration.guest_name if not registration.user else (registration.user.profile.name_full if hasattr(registration.user, 'profile') else registration.user.username)
            
            if recipient_email:
                send_status_update_email(
                    registration.user or recipient_email, # Can pass User object or email string if utility handles it
                    registration.event.title,
                    'approved',
                    None,
                    is_registration=True # New flag to differentiate from Event submission
                )
        except Exception as e:
            print(f"Failed to send approval email: {e}")

        return Response({"message": "Pendaftaran disetujui."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        registration = self.get_object()
        if not request.user.is_staff and registration.event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registration.status = 'rejected'
        registration.save()

        # Send email notification to registrant
        try:
            recipient_email = registration.guest_email if not registration.user else registration.user.email
            if recipient_email:
                send_status_update_email(
                    registration.user or recipient_email,
                    registration.event.title,
                    'rejected',
                    request.data.get('rejection_reason'),
                    is_registration=True
                )
        except Exception as e:
            print(f"Failed to send rejection email: {e}")

        return Response({"message": "Pendaftaran ditolak."})

def event_detail_seo(request, slug):
    """
    Serves the React index.html with dynamically injected SEO meta tags 
    for social media crawlers (WhatsApp, Facebook, etc.).
    """
    try:
        event = Event.objects.get(slug=slug)
        title = f"{event.title} | Barakah Economy"
        # Strip HTML tags and truncate for meta description
        description = re.sub(r'<[^>]*>', '', event.description or "")[:160]
        
        # Build absolute image URL
        site_url = request.build_absolute_uri('/')[:-1]
        image_url = ""
        if event.thumbnail:
            image_url = event.thumbnail.url
        elif event.header_image:
            image_url = event.header_image.url
        else:
            image_url = '/images/web-thumbnail.jpg'
            
        if not image_url.startswith('http'):
            image_url = f"{site_url}{image_url}"
            
        current_url = request.build_absolute_uri()
        
        # Path to the frontend index.html
        # Check build folder (production) then public folder (dev)
        index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'build', 'index.html')
        if not os.path.exists(index_path):
            index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'index.html')

        if not os.path.exists(index_path):
            return HttpResponse("Frontend index.html not found.", status=500)

        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Meta tags to inject
        meta_tags = f'''
    <title>{title}</title>
    <meta name="description" content="{description}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:url" content="{current_url}">
    <meta property="og:type" content="article">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="{title}">
    <meta property="twitter:description" content="{description}">
    <meta property="twitter:image" content="{image_url}">'''

        # Remove existing title tag and inject new tags into <head>
        content = re.sub(r'<title>.*?</title>', '', content)
        content = content.replace('</head>', f'{meta_tags}\n</head>')
        
        return HttpResponse(content)
        
    except (Event.DoesNotExist, Exception) as e:
        # Fallback: Serve normal index.html for SPA to handle
        try:
            index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'build', 'index.html')
            if not os.path.exists(index_path):
                index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'index.html')
            with open(index_path, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read())
        except:
            return HttpResponse("Not Found", status=404)
