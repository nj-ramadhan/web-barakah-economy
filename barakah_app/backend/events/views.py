from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
import csv
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile
from .serializers import EventSerializer, EventRegistrationSerializer
from django_filters.rest_framework import DjangoFilterBackend
from barakah_app.utils import send_status_update_email
import json
from django.utils import timezone
from accounts import whatsapp_service
from .payment_ocr_service import extract_payment_data
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

        # Regular users can create/update their own events
        if self.action in ['create', 'update', 'partial_update', 'my_events']:
            return [permissions.IsAuthenticated()]
            
        # Deny others
        return [permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        self._auto_complete_expired_events()
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._auto_complete_expired_events()
        instance = self.get_object()
        from django.db.models import F
        instance.view_count = F('view_count') + 1
        instance.save(update_fields=['view_count'])
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

        # Authorization check: Admin OR Owner
        is_admin = request.user.has_menu_access('admin_events') or request.user.is_staff
        is_owner = instance.created_by == request.user
        
        if not (is_admin or is_owner):
            return Response({"error": "Anda tidak memiliki izin untuk mengedit event ini."}, status=status.HTTP_403_FORBIDDEN)
        
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
        # Include both approved and completed events in the public list, filtering for public visibility
        now = timezone.now()
        base_query = Event.objects.filter(
            status__in=['approved', 'completed', 'ongoing'], 
            visibility='public'
        ).filter(
            Q(visible_at__isnull=True) | Q(visible_at__lte=now)
        )
        
        # Sort logic:
        # 1. Upcoming/Ongoing events (start_date >= now or end_date >= now) sorted by start_date ASC
        # 2. Past events (end_date < now) sorted by start_date DESC
        
        upcoming_events = base_query.filter(
            Q(start_date__gte=now) | Q(end_date__gte=now)
        ).order_by('start_date')
        
        past_events = base_query.filter(
            Q(end_date__lt=now) | Q(end_date__isnull=True, start_date__lt=now)
        ).exclude(id__in=upcoming_events).order_by('-start_date')
        
        events = list(upcoming_events) + list(past_events)
        
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
        now = timezone.now()
        
        # Check if event is visible
        if event.visible_at and now < event.visible_at:
            return Response({
                "error": "Event ini belum tersedia."
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if registration is open
        if event.registration_start_at and now < event.registration_start_at:
            time_str = timezone.localtime(event.registration_start_at).strftime('%d %b %Y %H:%M')
            return Response({
                "error": f"Pendaftaran belum dibuka. Pendaftaran akan dibuka pada {time_str} WIB."
            }, status=status.HTTP_400_BAD_REQUEST)
        
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
        payment_method = request.data.get('payment_method', 'transfer')
        payment_proof = request.FILES.get('payment_proof')
        payment_amount = request.data.get('payment_amount', 0)
        
        # Check if event allows OTS
        is_ots_valid = event.allow_ots_payment and payment_method == 'ots'

        if event.price_type != 'free' and not is_ots_valid and not payment_proof:
            return Response({"error": "Bukti pembayaran wajib diunggah untuk event berbayar."}, status=status.HTTP_400_BAD_REQUEST)

        # 2b. OCR Validation (Only for transfer)
        ocr_data = None
        ocr_verified = False
        if payment_proof and not is_ots_valid:
            import decimal
            try:
                expected_amount = decimal.Decimal(str(payment_amount))
            except:
                expected_amount = decimal.Decimal('0')

            # Call OCR Service
            ocr_result = extract_payment_data(payment_proof)
            
            if '_error' in ocr_result:
                # If AI fails, we still allow but warn? 
                # User requested: "kalo tidak sesuai maka berikan info / notif nya"
                # For now let's be strict if AI works but data is wrong.
                # If AI itself fails (API error), let it pass as unverified.
                pass
            else:
                ocr_data = ocr_result
                extracted_name = str(ocr_result.get('recipient_name', '')).lower()
                extracted_amount = ocr_result.get('amount')
                
                # Validation logic
                valid_names = ['bae community', 'deny setiawan']
                is_name_valid = any(vn in extracted_name for vn in valid_names)
                
                # Amount validation
                is_amount_valid = False
                expected_amount_float = float(expected_amount)
                extracted_amount_float = 0.0
                if extracted_amount:
                    try:
                        extracted_amount_float = float(extracted_amount)
                        # Convert both to float for comparison if they are numbers
                        is_amount_valid = abs(extracted_amount_float - expected_amount_float) < 1
                    except:
                        pass
                
                if not is_name_valid:
                    return Response({
                        "error": f"Penerima di bukti transfer ('{ocr_result.get('recipient_name') or 'Tidak terdeteksi'}') tidak sesuai. Bukti transfer harus ditujukan ke 'BAE Community' atau pengurus BAE."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if not is_amount_valid:
                    return Response({
                        "error": f"Nominal di bukti transfer (Rp {extracted_amount_float:,.0f}) tidak sesuai dengan 'Total yang Harus Ditransfer' (Rp {expected_amount_float:,.0f}). Harap periksa nominal transfer Anda."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                ocr_verified = True

        # 3. Create registration
        # Status defaults to 'pending' as defined in model
        registration = EventRegistration.objects.create(
            event=event,
            user=user,
            responses=responses,
            payment_method=payment_method,
            payment_proof=payment_proof,
            payment_amount=payment_amount,
            ocr_data=ocr_data,
            ocr_verified=ocr_verified,
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
        
        # 5. Auto-update user phone if missing
        self._update_user_phone_if_missing(registration)
        
        # 6. Automated Notifications
        try:
            self._send_registration_notifications(registration)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send notifications for registration {registration.id}: {e}")
        
        return Response({"message": "Pendaftaran berhasil! Kode tiket Anda: " + registration.unique_code, "id": registration.id, "unique_code": registration.unique_code}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def manual_register(self, request, slug=None):
        """
        Manually add a participant (Admin/Organizer only).
        Skips payment validation and auto-approves.
        """
        event = self.get_object()
        
        # Check permissions: Admin or Event Creator
        if not (request.user.is_staff or event.created_by == request.user or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Basic identification
        name = request.data.get('name')
        email = request.data.get('email')
        phone = request.data.get('phone')
        responses = request.data.get('responses', {})
        
        if not name:
            return Response({"error": "Nama wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse responses if string
        if isinstance(responses, str):
            try:
                responses = json.loads(responses)
            except:
                responses = {}

        # Build sessions info for email/WA
        session_list = []
        for s in event.sessions.all().order_by('order', 'start_time'):
            time_str = f"({s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')})" if s.start_time and s.end_time else ""
            session_list.append(f"- {s.title} {time_str}")
        sessions_str = "\n".join(session_list)

        # Create registration
        user_id = request.data.get('user_id')
        user_obj = None
        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user_obj = User.objects.filter(id=user_id).first()

        registration = EventRegistration.objects.create(
            event=event,
            user=user_obj,
            guest_name=name if not user_obj else None,
            guest_email=email if not user_obj else None,
            responses=responses,
            status='approved',
            payment_status='verified',
            payment_amount=0,
            ocr_verified=True
        )

        # Send WhatsApp confirmation if possible
        try:
            whatsapp_msg = f"Halo {name},\n\nAnda telah didaftarkan secara manual untuk event *{event.title}*.\n\n*Rincian Sesi:*\n{sessions_str}\n\nKode Tiket: *{registration.unique_code}*\n\nTerima kasih!"
            whatsapp_service.send_message(phone, whatsapp_msg)
        except Exception as e:
            print(f"Failed to send manual registration WA: {e}")

        # Send Email
        try:
            if email:
                send_status_update_email(
                    email,
                    event.title,
                    'approved',
                    is_registration=True,
                    extra_details=f"Jadwal Sesi:\n{sessions_str}" if sessions_str else None
                )
        except Exception as e:
            print(f"Failed to send manual registration email: {e}")

        # Handle file uploads if any (though unlikely for manual add)
        form_fields = event.form_fields.all()
        for field in form_fields:
            if field.field_type == 'file' and str(field.id) in request.FILES:
                EventRegistrationFile.objects.create(
                    registration=registration,
                    field=field,
                    file=request.FILES[str(field.id)]
                )

        # Trigger notifications (WhatsApp & Email)
        try:
            self._send_registration_notifications(registration)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send manual registration notifications: {e}")

        return Response({
            "message": f"Peserta {name} berhasil ditambahkan secara manual.",
            "unique_code": registration.unique_code,
            "id": registration.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def bulk_manual_register(self, request, slug=None):
        """
        Register multiple users manually (Admin only).
        """
        event = self.get_object()
        if not (request.user.is_staff or event.created_by == request.user or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({"error": "Pilih minimal satu user."}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.models import User
        users = User.objects.filter(id__in=user_ids)
        
        count = 0
        for user in users:
            # Skip if already registered
            if EventRegistration.objects.filter(event=event, user=user).exists():
                continue
                
            registration = EventRegistration.objects.create(
                event=event,
                user=user,
                status='approved',
                payment_status='verified',
                payment_amount=0,
                ocr_verified=True
            )
            count += 1
            
            # Send Notifications
            try:
                self._send_registration_notifications(registration)
            except:
                pass

        return Response({
            "message": f"Berhasil mendaftarkan {count} user secara manual."
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='available-users')
    def available_users(self, request, slug=None):
        """Get users who are NOT yet registered for this event and have complete data."""
        event = self.get_object()
        if not (request.user.is_staff or event.created_by == request.user or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import User
        
        search = request.query_params.get('search', '')
        
        # Get IDs of users already registered
        registered_ids = EventRegistration.objects.filter(event=event, user__isnull=False).values_list('user_id', flat=True)
        
        users = User.objects.exclude(id__in=registered_ids).filter(
            email__isnull=False,
            phone__isnull=False,
            profile__name_full__isnull=False
        ).exclude(
            email=''
        ).exclude(
            phone=''
        ).exclude(
            profile__name_full=''
        )
        
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__name_full__icontains=search) |
                Q(phone__icontains=search)
            )
            
        # Limit to 50 for performance
        users = users.select_related('profile')[:50]
        
        from accounts.serializers import UserAdminSerializer
        serializer = UserAdminSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def import_participants_csv(self, request, slug=None):
        """Import participants from CSV with Create/Update logic."""
        event = self.get_object()
        if not (request.user.is_staff or event.created_by == request.user or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        import csv
        import io
        from django.db import transaction

        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            # Try to detect delimiter (usually ; or ,)
            dialect = csv.Sniffer().sniff(io_string.read(1024))
            io_string.seek(0)
            reader = csv.DictReader(io_string, delimiter=dialect.delimiter)
        except Exception as e:
            # Fallback to semicolon if sniffing fails
            io_string.seek(0)
            reader = csv.DictReader(io_string, delimiter=';')

        created_count = 0
        updated_count = 0
        errors = []
        
        form_fields = {f.label.lower(): str(f.id) for f in event.form_fields.all()}

        for row_idx, row in enumerate(reader):
            try:
                with transaction.atomic():
                    reg_id = row.get('ID') or row.get('id')
                    email = row.get('Email', '').strip()
                    phone = row.get('Phone', '').strip() or row.get('WhatsApp', '').strip() or row.get('No HP', '').strip()
                    name = row.get('Nama', '').strip() or row.get('Name', '').strip() or row.get('Full Name', '').strip()
                    
                    registration = None
                    if reg_id and reg_id.isdigit():
                        registration = EventRegistration.objects.filter(id=reg_id, event=event).first()
                    
                    if not registration and (email or phone):
                        # Try to match by user email/phone if not found by ID
                        from django.db.models import Q
                        q = Q()
                        if email: q |= Q(user__email=email) | Q(guest_email=email)
                        if phone: q |= Q(user__phone=phone) | Q(responses__contains={v: phone for k, v in form_fields.items() if 'phone' in k or 'wa' in k})
                        
                        if q:
                            registration = EventRegistration.objects.filter(q, event=event).first()

                    # Collect responses from extra columns
                    responses = registration.responses if registration else {}
                    for key, value in row.items():
                        clean_key = key.lower().strip()
                        if clean_key in form_fields:
                            field_id = form_fields[clean_key]
                            responses[field_id] = value

                    if registration:
                        # Update
                        if name:
                            if registration.user:
                                # We don't usually update user profile name from event import unless empty
                                pass
                            else:
                                registration.guest_name = name
                        
                        if email and not registration.user:
                            registration.guest_email = email
                            
                        registration.responses = responses
                        registration.save()
                        updated_count += 1
                    else:
                        # Create
                        # Check if user exists in accounts
                        from accounts.models import User
                        user_obj = None
                        if email:
                            user_obj = User.objects.filter(email=email).first()
                        if not user_obj and phone:
                            user_obj = User.objects.filter(phone=phone).first()

                        registration = EventRegistration.objects.create(
                            event=event,
                            user=user_obj,
                            guest_name=name if not user_obj else None,
                            guest_email=email if not user_obj else None,
                            responses=responses,
                            status='approved',
                            payment_status='verified',
                            payment_amount=0,
                            ocr_verified=True
                        )
                        created_count += 1
                        
                        # Send notification for NEW registrations
                        try:
                            self._send_registration_notifications(registration)
                        except:
                            pass
            except Exception as e:
                errors.append(f"Baris {row_idx + 2}: {str(e)}")

        return Response({
            "message": f"Impor selesai. {created_count} baru, {updated_count} diperbarui.",
            "errors": errors if errors else None
        })

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

        # Prepare time string with timezone handling
        # Use timezone.localtime to convert from UTC to Asia/Jakarta (set in settings)
        local_start = timezone.localtime(registration.event.start_date)
        time_str = local_start.strftime('%d %b %Y %H:%M')
        
        if registration.event.end_date:
            local_end = timezone.localtime(registration.event.end_date)
            if local_start.date() == local_end.date():
                time_str += f" - {local_end.strftime('%H:%M')}"
            else:
                time_str += f" - {local_end.strftime('%d %b %Y %H:%M')}"

        # Prepare sessions string
        sessions_str = ""
        sessions = registration.event.sessions.all()
        if sessions.exists():
            sessions_str = "\n\n*Rangkaian Acara:*"
            for ses in sessions:
                s_start = timezone.localtime(ses.start_time).strftime('%H:%M') if ses.start_time else ""
                s_end = timezone.localtime(ses.end_time).strftime('%H:%M') if ses.end_time else ""
                time_range = f" ({s_start} - {s_end})" if s_start else ""
                sessions_str += f"\n- {ses.title}{time_range}"

        # Send WhatsApp
        if phone:
            formatted_phone = self._format_phone_number(phone)
            unique_code = registration.unique_code or '-'
            wa_message = (
                f"Halo! Terima kasih telah mendaftar di event: *{registration.event.title}*.\n\n"
                f"✅ Pendaftaran Anda diterima!\n\n"
                f"🎫 *KODE TIKET ANDA:*\n"
                f"━━━━━━━━━━━━━━━━\n"
                f"*{unique_code}*\n"
                f"━━━━━━━━━━━━━━━━\n\n"
                f"📌 Simpan kode ini sebagai tiket masuk event. Kode ini akan di-scan saat Anda hadir.\n"
                f"📷 QR Code tiket bisa dilihat di halaman detail event.\n\n"
                f"📅 Waktu: {time_str}\n"
                f"📍 Lokasi: {registration.event.location}\n"
                f"🔗 Link Lokasi: {registration.event.location_url or '-'}"
                f"{sessions_str}\n\n"
                f"Salam,\nBarakah Economy"
            )
            
            # Send text message first
            msg_res = whatsapp_service.send_message(formatted_phone, wa_message)
            if not msg_res.get('success'):
                import logging
                logging.getLogger(__name__).error(f"WhatsApp text send failed for {formatted_phone}: {msg_res.get('message')}")

            # Send Image (BIB if available, else QR)
            sent_image = False
            
            # Try to send BIB if enabled
            if registration.event.has_bib:
                try:
                    bib_buffer = self._generate_bib_image(registration)
                    if bib_buffer:
                        import base64
                        encoded = base64.b64encode(bib_buffer.read()).decode('utf-8')
                        file_b64 = f"data:image/jpeg;base64,{encoded}"
                        fmt = registration.event.bib_template.number_format or '001'
                        formatted_bib = str(registration.bib_number).zfill(len(fmt))
                        
                        img_res = whatsapp_service.send_file(
                            formatted_phone, 
                            f"Nomor Punggung (BIB) - {unique_code}", 
                            file_b64, 
                            filename=f"BIB_{formatted_bib}.jpg"
                        )
                        if img_res.get('success'):
                            sent_image = True
                        else:
                            logging.getLogger(__name__).warning(f"WhatsApp BIB send failed, falling back to QR: {img_res.get('message')}")
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Error in automatic BIB sending: {e}")

            # Fallback to QR if BIB not sent or not applicable
            if not sent_image and registration.qr_image:
                try:
                    import base64
                    registration.qr_image.seek(0)
                    encoded = base64.b64encode(registration.qr_image.read()).decode('utf-8')
                    file_b64 = f"data:image/png;base64,{encoded}"
                    img_res = whatsapp_service.send_file(
                        formatted_phone, 
                        f"QR Tiket {unique_code}", 
                        file_b64, 
                        filename=f"tiket_{unique_code}.png"
                    )
                    if not img_res.get('success'):
                        logging.getLogger(__name__).error(f"WhatsApp QR send failed for {formatted_phone}: {img_res.get('message')}")
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Gagal mengirim gambar WA QR: {e}")

            subject = f"Konfirmasi Pendaftaran Event: {registration.event.title}"
            email_body = (
                f"Assalamu'alaikum,\n\n"
                f"Terima kasih telah mendaftar di event '{registration.event.title}'.\n"
                f"Pendaftaran Anda telah berhasil dikonfirmasi secara otomatis.\n\n"
                f"🎫 KODE TIKET ANDA: {registration.unique_code or '-'}\n\n"
                f"Detail Event:\n"
                f"- Judul: {registration.event.title}\n"
                f"- Lokasi: {registration.event.location}\n"
                f"- Waktu: {time_str}\n\n"
                f"🔗 Link Lokasi: {registration.event.location_url or '-'}\n\n"
                f"QR Code tiket Anda terlampir pada email ini.\n"
                f"Terima kasih,\nTim Barakah Economy"
            )
            
            try:
                email_msg = EmailMessage(
                    subject,
                    email_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [email]
                )
                
                # Attach QR Image if exists
                if registration.qr_image:
                    # Seek to beginning if it was read elsewhere
                    registration.qr_image.seek(0)
                    email_msg.attach(f"tiket_{registration.unique_code}.png", registration.qr_image.read(), 'image/png')
                
                email_msg.send(fail_silently=True)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Gagal mengirim email QR: {e}")

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
        
        # Return only digits (no +) for better compatibility with WA Gateways
        return digits

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def blast_whatsapp(self, request, slug=None):
        """Blast WhatsApp messages to all participants of an event."""
        event = self.get_object()
        
        # Check if user is the organizer or admin
        if not (request.user.is_staff or event.created_by == request.user):
            return Response({"error": "Hanya admin atau penyelenggara yang bisa mengirim blast."}, status=status.HTTP_403_FORBIDDEN)
            
        custom_message = request.data.get('message')
        image_base64 = request.data.get('image_base64') # Optional
        
        if not custom_message:
            return Response({"error": "Pesan tidak boleh kosong."}, status=status.HTTP_400_BAD_REQUEST)
            
        registrations_ids = request.data.get('registration_ids')
        if registrations_ids:
            registrations = EventRegistration.objects.filter(id__in=registrations_ids, event=event).select_related('user', 'user__profile').prefetch_related('event__form_fields')
        else:
            registrations = EventRegistration.objects.filter(event=event, status='approved').select_related('user', 'user__profile').prefetch_related('event__form_fields')
        
        phone_list = []
        placeholder_data = []
        
        # Build sessions string for placeholder
        session_list = []
        for s in event.sessions.all().order_by('order', 'start_time'):
            time_str = f"({s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')})" if s.start_time and s.end_time else ""
            session_list.append(f"- {s.title} {time_str}")
        sessions_str = "\n".join(session_list) if session_list else "-"

        phone_list = []
        placeholder_data = []
        seen_phones = set()
        
        for reg in registrations:
            _, phone, detected_name = self._detect_contact_info_standalone(reg)
            if phone:
                # Robust normalization for deduplication (anchor at '8')
                raw_digits = ''.join(filter(str.isdigit, str(phone)))
                if raw_digits.startswith('620'): core_number = raw_digits[3:]
                elif raw_digits.startswith('62'): core_number = raw_digits[2:]
                elif raw_digits.startswith('0'): core_number = raw_digits[1:]
                else: core_number = raw_digits
                
                formatted_phone = self._format_phone_number(phone)
                if formatted_phone and core_number not in seen_phones:
                    seen_phones.add(core_number)
                    phone_list.append(formatted_phone)
                    placeholder_data.append({
                        'name': detected_name, 
                        'event': event.title,
                        'sessions': sessions_str
                    })
        
        if not phone_list:
            return Response({
                "error": "Tidak ada nomor WhatsApp peserta yang terdeteksi."
            }, status=status.HTTP_400_BAD_REQUEST)
            
        result = whatsapp_service.blast_messages(phone_list, custom_message, placeholder_data, file_data_base64=image_base64)
        
        return Response({
            "message": f"Blast selesai dikirim ke {result['success']} peserta.",
            "details": result
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def global_registrations(self, request):
        """Get all registrations across all events for CRM recap."""
        if not (request.user.is_staff or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        event_id = request.query_params.get('event_id')
        regs = EventRegistration.objects.all().select_related('event', 'user', 'user__profile').prefetch_related('event__form_fields')
        
        if event_id:
            regs = regs.filter(event_id=event_id)
            
        data = []
        for reg in regs:
            email, phone, name = self._detect_contact_info_standalone(reg)
            
            # Use serializer for responses_with_labels logic
            from .serializers import EventRegistrationSerializer
            serializer = EventRegistrationSerializer(reg)
            responses_with_labels = serializer.data.get('responses_with_labels', {})
            
            data.append({
                'id': reg.id,
                'event_title': reg.event.title,
                'event_id': reg.event.id,
                'name': name,
                'email': email,
                'phone': phone,
                'status': reg.status,
                'created_at': reg.created_at,
                'unique_code': reg.unique_code,
                'responses_with_labels': responses_with_labels
            })
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def global_blast_whatsapp(self, request):
        """Blast WhatsApp to selected participants from the global recap list."""
        if not (request.user.is_staff or request.user.has_menu_access('admin_events')):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        custom_message = request.data.get('message')
        image_base64 = request.data.get('image_base64')
        registration_ids = request.data.get('registration_ids')
        
        if not custom_message or not registration_ids:
            return Response({"error": "Pesan dan Peserta wajib dipilih."}, status=status.HTTP_400_BAD_REQUEST)
            
        registrations = EventRegistration.objects.filter(id__in=registration_ids).select_related('event', 'user', 'user__profile').prefetch_related('event__form_fields')
        
        phone_list = []
        placeholder_data = []
        seen_phones = set()
        
        for reg in registrations:
            _, phone, detected_name = self._detect_contact_info_standalone(reg)
            if phone:
                # Robust normalization for deduplication (anchor at '8')
                raw_digits = ''.join(filter(str.isdigit, str(phone)))
                if raw_digits.startswith('620'): core_number = raw_digits[3:]
                elif raw_digits.startswith('62'): core_number = raw_digits[2:]
                elif raw_digits.startswith('0'): core_number = raw_digits[1:]
                else: core_number = raw_digits

                formatted_phone = self._format_phone_number(phone)
                if formatted_phone and core_number not in seen_phones:
                    seen_phones.add(core_number)
                    phone_list.append(formatted_phone)
                    placeholder_data.append({
                        'name': detected_name, 
                        'event': reg.event.title
                    })
        
        if not phone_list:
            return Response({"error": "Tidak ada nomor WA valid."}, status=status.HTTP_400_BAD_REQUEST)
            
        result = whatsapp_service.blast_messages(phone_list, custom_message, placeholder_data, file_data_base64=image_base64)
        
        return Response({
            "message": f"Blast global selesai dikirim ke {result['success']} nomor unik.",
            "details": result
        })

    def _update_user_phone_if_missing(self, registration):
        """Update user profile phone if registration response contains a phone and user profile phone is empty."""
        user = registration.user
        if not user or (user.phone and user.phone.strip() and user.phone != '-'):
            return
            
        _, phone, _ = self._detect_contact_info_standalone(registration)
        if phone:
            user.phone = phone
            user.save(update_fields=['phone'])

    def _detect_contact_info_standalone(self, registration):
        """Standalone helper for detecting contact info from a registration."""
        responses = registration.responses or {}
        current_fields = {str(f.id): f.label for f in registration.event.form_fields.all()}
        
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
            
            if hasattr(registration.user, 'phone') and registration.user.phone: 
                phone = registration.user.phone
                is_profile_complete = True

        # Scan all responses (including legacy/orphaned ones)
        for field_id, value in responses.items():
            if not value or not isinstance(value, (str, int)): continue
            
            # Try to get label from current fields or legacy map
            label = current_fields.get(str(field_id))
            if not label:
                # Manual fallback for known orphaned IDs across all events
                legacy_map = {
                    '81': 'Nama', '82': 'Email', '83': 'No HP', '84': 'Asal Instansi', '85': 'Jenis Kelamin',
                    '56': 'Domisili/Kota', '57': 'Profesi/Pekerjaan', '58': 'Alasan Mengikuti', 
                    '59': 'Ekspektasi/Harapan', '60': 'Sumber Informasi', '71': 'WhatsApp', '72': 'No. Telp'
                }
                label = legacy_map.get(str(field_id))
                
                # If still no label, check if the key itself looks like a label (fallback)
                if not label and not field_id.isdigit():
                    label = field_id

            if not label: continue
            
            label_lower = label.lower()
            
            # Email detection
            if 'email' in label_lower: 
                email = str(value)
            
            # Phone detection
            if any(kw in label_lower for kw in ['wa', 'whatsapp', 'hp', 'telepon', 'phone', 'handphone']):
                phone = str(value)
            
            # Name detection
            if any(kw in label_lower for kw in ['nama', 'name', 'fullname']):
                if not is_profile_complete or 'lengkap' in label_lower:
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_gallery_images(self, request, slug=None):
        """Upload supporting gallery images."""
        event = self.get_object()
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        images = request.FILES.getlist('images')
        if not images:
            return Response({"error": "No images provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        from .models import EventGalleryImage
        for img in images:
            EventGalleryImage.objects.create(event=event, image=img)
            
        return Response({"message": f"Successfully uploaded {len(images)} gallery images."})

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def delete_gallery_image(self, request, slug=None):
        """Delete a gallery image."""
        event = self.get_object()
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        image_id = request.data.get('image_id')
        from .models import EventGalleryImage
        try:
            img = EventGalleryImage.objects.get(id=image_id, event=event)
            img.delete()
            return Response({"message": "Gallery image deleted."})
        except EventGalleryImage.DoesNotExist:
            return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post', 'get'], permission_classes=[permissions.IsAuthenticated])
    def certificate_settings(self, request, slug=None):
        """Manage certificate settings for an event."""
        event = self.get_object()
        if not (request.user.is_staff or event.created_by == request.user):
            return Response({"error": "Hanya penyelenggara yang bisa mengelola sertifikat."}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import EventCertificate
        from .serializers import EventCertificateSerializer
        
        try:
            cert, created = EventCertificate.objects.get_or_create(event=event)
            
            if request.method == 'POST':
                # Handle template_image if provided in request.FILES
                if 'template_image' in request.FILES:
                    cert.template_image = request.FILES['template_image']
                
                # Update other fields
                for field in ['name_x', 'name_y', 'font_size', 'font_color', 'font_family', 'show_unique_code', 'code_x', 'code_y', 'code_font_size', 'is_active', 'font_bold', 'font_italic', 'name_width', 'name_height', 'text_align']:
                    if field in request.data:
                        val = request.data.get(field)
                        try:
                            if field in ['name_x', 'name_y', 'code_x', 'code_y', 'name_width', 'name_height']: val = float(val)
                            if field in ['font_size', 'code_font_size']: val = int(val)
                            if field in ['is_active', 'show_unique_code', 'font_bold', 'font_italic']: 
                                val = val in [True, 'true', '1', 1]
                            setattr(cert, field, val)
                        except (ValueError, TypeError):
                            pass
                
                cert.save()
                return Response(EventCertificateSerializer(cert).data)
                
            # GET request
            return Response(EventCertificateSerializer(cert).data)
        except Exception as e:
            return Response({
                "error": "Gagal mengakses pengaturan sertifikat. Pastikan migrasi database sudah dijalankan.",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download_certificate(self, request, slug=None):
        """Download personalized certificate for the user."""
        event = self.get_object()
        
        from .models import EventCertificate, EventRegistration
        try:
            cert = event.certificate
            if not cert.is_active or not cert.template_image:
                return Response({"error": "Sertifikat belum diaktifkan oleh penyelenggara."}, status=status.HTTP_400_BAD_REQUEST)
        except EventCertificate.DoesNotExist:
            return Response({"error": "Sertifikat tidak tersedia untuk event ini."}, status=status.HTTP_404_NOT_FOUND)
            
        # Verify registration
        registration = EventRegistration.objects.filter(event=event, user=request.user, status='approved').first()
        if not registration:
            return Response({"error": "Hanya peserta terdaftar yang bisa mengunduh sertifikat."}, status=status.HTTP_403_FORBIDDEN)
            
        # Get name from responses
        _, _, participant_name = self._detect_contact_info_standalone(registration)
        if not participant_name:
            profile = getattr(request.user, 'profile', None)
            participant_name = profile.name_full if profile and profile.name_full else request.user.username

        # Generate image using Pillow
        from PIL import Image, ImageDraw, ImageFont
        import os
        from django.http import HttpResponse
        from io import BytesIO
        
        try:
            # Open template
            img = Image.open(cert.template_image.path).convert("RGB")
            draw = ImageDraw.Draw(img)
            width, height = img.size
            
            # Position calculations (percentages to pixels)
            name_x_px = int(width * cert.name_x / 100)
            name_y_px = int(height * cert.name_y / 100)
            name_width_px = int(width * cert.name_width / 100)
            name_height_px = int(height * cert.name_height / 100)
            
            # Scale font size relative to image height (reference: 1000px height)
            scaled_font_size = int((cert.font_size / 1000.0) * height)
            
            # Load font
            font_filename = cert.font_family
            fonts_dir = os.path.join(os.path.dirname(__file__), 'fonts')
            os.makedirs(fonts_dir, exist_ok=True)
            font_path = os.path.join(fonts_dir, font_filename)
            
            # Auto-download if missing
            if not os.path.exists(font_path):
                import requests
                font_urls = {
                    'DancingScript-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf',
                    'GreatVibes-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf',
                    'Roboto-Bold.ttf': 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
                    'PlayfairDisplay-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
                    'Montserrat-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-SemiBold.ttf'
                }
                if font_filename in font_urls:
                    try:
                        r = requests.get(font_urls[font_filename], timeout=10)
                        if r.status_code == 200:
                            with open(font_path, 'wb') as f:
                                f.write(r.content)
                    except:
                        pass

            font = None
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, scaled_font_size)
                except:
                    pass
            
            if not font:
                # Attempt to find any font in a common system location
                fallbacks = ["arial.ttf", "DejaVuSans.ttf", "Roboto-Regular.ttf"]
                if cert.font_bold:
                    fallbacks = ["arialbd.ttf", "DejaVuSans-Bold.ttf"] + fallbacks
                
                for f in fallbacks:
                    try:
                        font = ImageFont.truetype(f, scaled_font_size)
                        if font: break
                    except:
                        continue
            
            if not font:
                font = ImageFont.load_default()
                
            # Word Wrap Logic
            def wrap_text(text, font, max_width):
                lines = []
                words = text.split()
                if not words: return [text]
                
                current_line = words[0]
                for word in words[1:]:
                    test_line = current_line + " " + word
                    try:
                        left, top, right, bottom = draw.textbbox((0, 0), test_line, font=font)
                        w = right - left
                    except:
                        w, _ = draw.textsize(test_line, font=font)
                    
                    if w <= max_width:
                        current_line = test_line
                    else:
                        lines.append(current_line)
                        current_line = word
                lines.append(current_line)
                return lines

            lines = wrap_text(participant_name, font, name_width_px)

            # Calculate total height of all lines to handle vertical alignment
            total_text_height = 0
            line_details = []
            for line in lines:
                try:
                    left, top, right, bottom = draw.textbbox((0, 0), line, font=font)
                    w, h = right - left, bottom - top
                except:
                    w, h = draw.textsize(line, font=font)
                
                line_spacing = int(h * 0.2)
                line_details.append({'text': line, 'w': w, 'h': h, 'spacing': line_spacing})
                total_text_height += h + line_spacing
            
            if line_details:
                total_text_height -= line_details[-1]['spacing'] # Remove last spacing

            # Calculate starting Y based on vertical alignment
            v_align = getattr(cert, 'vertical_align', 'middle')
            if v_align == 'middle':
                current_y = name_y_px + (name_height_px - total_text_height) // 2
            elif v_align == 'bottom':
                current_y = name_y_px + name_height_px - total_text_height
            else: # top
                current_y = name_y_px

            # Draw each line
            for detail in line_details:
                # Horizontal alignment
                if cert.text_align == 'center':
                    line_x = name_x_px + (name_width_px - detail['w']) // 2
                elif cert.text_align == 'right':
                    line_x = name_x_px + name_width_px - detail['w']
                else: # left
                    line_x = name_x_px
                
                draw.text((line_x, current_y), detail['text'], font=font, fill=cert.font_color)
                current_y += detail['h'] + detail['spacing']

            # Draw unique code if enabled
            if getattr(cert, 'show_unique_code', False):
                code_text = f"ID: {registration.unique_code or 'N/A'}"
                code_font_size = int((cert.code_font_size / 1000.0) * height)
                code_font_family = getattr(cert, 'code_font_family', 'Roboto-Bold.ttf')
                code_font_color = getattr(cert, 'code_font_color', cert.font_color)
                
                code_font_path = os.path.join(fonts_dir, code_font_family)
                
                # Auto-download code font if missing
                if not os.path.exists(code_font_path):
                    try:
                        font_urls = {
                            'DancingScript-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf',
                            'GreatVibes-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf',
                            'Roboto-Bold.ttf': 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
                            'PlayfairDisplay-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
                            'Montserrat-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-SemiBold.ttf'
                        }
                        if code_font_family in font_urls:
                            import requests
                            r = requests.get(font_urls[code_font_family], timeout=10)
                            if r.status_code == 200:
                                with open(code_font_path, 'wb') as f:
                                    f.write(r.content)
                    except:
                        pass

                code_font = None
                if os.path.exists(code_font_path):
                    try:
                        code_font = ImageFont.truetype(code_font_path, code_font_size)
                    except:
                        pass
                
                if not code_font:
                    code_font = font # Fallback to name font but with code size

                draw.text(
                    (int(width * cert.code_x / 100), int(height * cert.code_y / 100)), 
                    code_text, 
                    font=code_font, 
                    fill=code_font_color
                )
            
            # Return image
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=95)
            response = HttpResponse(buffer.getvalue(), content_type="image/jpeg")
            response['Content-Disposition'] = f'attachment; filename="Sertifikat_{registration.unique_code}.jpg"'
            return response
            
        except Exception as e:
            return Response({"error": f"Gagal membuat sertifikat: {str(e)}"}, status=500)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_registration(self, request, slug=None):
        """Get current user's registration detail for this event."""
        event = self.get_object()
        reg = EventRegistration.objects.filter(event=event, user=request.user).first()
        if not reg:
            return Response({'detail': 'Belum terdaftar'}, status=status.HTTP_404_NOT_FOUND)
        from .serializers import EventRegistrationSerializer
        return Response(EventRegistrationSerializer(reg).data)

    def _generate_bib_image(self, registration):
        """Internal helper to generate a personalized BIB image."""
        try:
            bib = registration.event.bib_template
            if not bib.is_active or not bib.template_image:
                return None
        except Exception:
            return None

        # Get name and formatted bib
        _, _, participant_name = self._detect_contact_info_standalone(registration)
        if not participant_name:
            if registration.user:
                profile = getattr(registration.user, 'profile', None)
                participant_name = profile.name_full if profile and profile.name_full else registration.user.username
            else:
                participant_name = registration.guest_name or "Participant"

        # Format BIB number
        fmt = bib.number_format or '001'
        formatted_bib = str(registration.bib_number).zfill(len(fmt))

        # Generate image using Pillow
        from PIL import Image, ImageDraw, ImageFont
        import os
        from io import BytesIO
        from django.db import models
        
        try:
            # Open template
            img = Image.open(bib.template_image.path).convert("RGB")
            draw = ImageDraw.Draw(img)
            width, height = img.size
            
            # Position calculations (percentages to pixels)
            num_x_px = int(width * bib.number_x / 100)
            num_y_px = int(height * bib.number_y / 100)
            name_x_px = int(width * bib.name_x / 100)
            name_y_px = int(height * bib.name_y / 100)
            
            # Scale font size relative to image height (reference: 1000px height)
            num_font_size = int((bib.number_font_size / 1000.0) * height)
            name_font_size = int((bib.name_font_size / 1000.0) * height)
            
            # Load font
            fonts_dir = os.path.join(os.path.dirname(__file__), 'fonts')
            os.makedirs(fonts_dir, exist_ok=True)

            def get_font(font_family, size):
                f_path = os.path.join(fonts_dir, font_family)
                if not os.path.exists(f_path):
                    # Attempt download
                    font_urls = {
                        'DancingScript-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf',
                        'GreatVibes-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf',
                        'Roboto-Bold.ttf': 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
                        'PlayfairDisplay-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
                        'Montserrat-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-SemiBold.ttf',
                        'OpenSans-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/opensans/static/OpenSans-Bold.ttf',
                        'Poppins-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
                    }
                    if font_family in font_urls:
                        import requests
                        try:
                            r = requests.get(font_urls[font_family], timeout=10)
                            if r.status_code == 200:
                                with open(f_path, 'wb') as f:
                                    f.write(r.content)
                        except: pass
                
                if os.path.exists(f_path):
                    try: return ImageFont.truetype(f_path, size)
                    except: pass
                return ImageFont.load_default()

            def draw_centered_text(text, font, x, y, color):
                try:
                    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
                    w, h = right - left, bottom - top
                except:
                    w, h = draw.textsize(text, font=font)
                draw.text((x - w/2, y - h/2), text, font=font, fill=color)

            # Draw BIB
            num_font_family = getattr(bib, 'number_font_family', 'Roboto-Bold.ttf')
            draw_centered_text(formatted_bib, get_font(num_font_family, num_font_size), num_x_px, num_y_px, bib.number_color)
            
            # Draw Name
            name_font_family = getattr(bib, 'name_font_family', 'Roboto-Bold.ttf')
            draw_centered_text(participant_name.upper(), get_font(name_font_family, name_font_size), name_x_px, name_y_px, bib.name_color)
            
            # Draw Photo if enabled
            if bib.show_photo:
                # Find "Pas Foto" in registration files
                photo_file = registration.uploaded_files.filter(
                    models.Q(field__label__icontains='pas foto') | 
                    models.Q(field__label__icontains='foto peserta')
                ).first()
                
                if photo_file and photo_file.file:
                    try:
                        participant_photo = Image.open(photo_file.file.path).convert("RGBA")
                        
                        # Calculate pixel dimensions for photo
                        photo_w_px = int(width * bib.photo_width / 100)
                        photo_h_px = int(height * bib.photo_height / 100)
                        photo_x_px = int(width * bib.photo_x / 100)
                        photo_y_px = int(height * bib.photo_y / 100)
                        
                        participant_photo = participant_photo.resize((photo_w_px, photo_h_px), Image.LANCZOS)
                        
                        # Paste photo onto BIB
                        img.paste(participant_photo, (photo_x_px - photo_w_px//2, photo_y_px - photo_h_px//2), participant_photo)
                    except Exception: pass

            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=95)
            buffer.seek(0)
            return buffer
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error generating BIB image: {e}")
            return None

    @action(detail=True, methods=['post', 'get'], permission_classes=[permissions.IsAuthenticated])
    def bib_settings(self, request, slug=None):
        """Manage BIB template settings for an event."""
        event = self.get_object()
        if not (request.user.is_staff or event.created_by == request.user):
            return Response({"error": "Hanya penyelenggara yang bisa mengelola nomor punggung."}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import EventBib
        from .serializers import EventBibSerializer
        
        try:
            bib, created = EventBib.objects.get_or_create(event=event)
            
            if request.method == 'POST':
                if 'template_image' in request.FILES:
                    bib.template_image = request.FILES['template_image']
                
                for field in ['number_x', 'number_y', 'number_font_size', 'number_color', 'number_font_family', 'name_x', 'name_y', 'name_font_size', 'name_color', 'name_font_family', 'number_format', 'is_active', 'show_photo', 'photo_x', 'photo_y', 'photo_width', 'photo_height']:
                    if field in request.data:
                        val = request.data.get(field)
                        try:
                            if field in ['number_x', 'number_y', 'name_x', 'name_y', 'photo_x', 'photo_y', 'photo_width', 'photo_height']: 
                                val = float(val)
                            if field in ['number_font_size', 'name_font_size']: 
                                val = int(val)
                            if field in ['is_active', 'show_photo']: 
                                val = str(val).lower() in ['true', '1', 'yes']
                            setattr(bib, field, val)
                        except Exception as e:
                            print(f"Error setting field {field}: {e}")
                
                bib.save()
                return Response(EventBibSerializer(bib).data)
            
            return Response(EventBibSerializer(bib).data)
        except Exception as e:
            if "column" in str(e).lower() or "no such column" in str(e).lower():
                return Response({"error": f"Database belum di-update (Missing Column). Silakan jalankan 'python manage.py migrate' di server. Error: {str(e)}"}, status=500)
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download_bib(self, request, slug=None):
        """Download personalized BIB (race number) for the user."""
        event = self.get_object()
        
        from .models import EventRegistration
        # Verify registration
        registration = EventRegistration.objects.filter(event=event, user=request.user, status='approved').first()
        if not registration:
            return Response({"error": "Hanya peserta terdaftar yang bisa mengunduh nomor punggung."}, status=status.HTTP_403_FORBIDDEN)
            
        buffer = self._generate_bib_image(registration)
        if not buffer:
            return Response({"error": "Gagal membuat nomor punggung atau template belum siap."}, status=status.HTTP_400_BAD_REQUEST)

        # Format BIB number for filename
        try:
            fmt = event.bib_template.number_format or '001'
        except:
            fmt = '001'
        formatted_bib = str(registration.bib_number).zfill(len(fmt))

        from django.http import HttpResponse
        response = HttpResponse(buffer.getvalue(), content_type="image/jpeg")
        response['Content-Disposition'] = f'attachment; filename="BIB_{formatted_bib}.jpg"'
        return response

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def scan_attendance(self, request, slug=None):
        """Scan QR code untuk menandai kehadiran peserta (per sesi)."""
        event = self.get_object()
        
        # Hanya organizer atau admin event
        if not (request.user.is_staff or event.created_by == request.user or request.user.has_menu_access('admin_events')):
            return Response({'error': 'Hanya penyelenggara atau admin yang bisa scan kehadiran.'}, status=status.HTTP_403_FORBIDDEN)
        
        unique_code = request.data.get('unique_code', '').strip().upper()
        # Handle cases where session_id might be "null" string or empty
        session_id = request.data.get('session_id')
        if session_id in [None, 'null', 'undefined', '']:
            session_id = None
        
        if not unique_code:
            return Response({'error': 'Kode unik wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            registration = EventRegistration.objects.get(event=event, unique_code=unique_code)
        except EventRegistration.DoesNotExist:
            return Response({'error': 'Kode tidak valid atau tidak terdaftar di event ini.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Determine session
        session = None
        if session_id:
            try:
                session = event.sessions.get(id=session_id)
            except (EventSession.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Sesi tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If event has sessions but none selected, refuse to scan or default to None (General)
        # However, to prevent data mess, we should encourage picking a session if they exist
        if event.sessions.exists() and not session:
            # OPTIONAL: Uncomment if we want to FORCE session selection
            # return Response({'error': 'Silakan pilih sesi terlebih dahulu pada menu scan.'}, status=status.HTTP_400_BAD_REQUEST)
            pass

        from .models import EventAttendance
        from django.utils import timezone
        
        # Check per-session attendance
        attendance_exists = EventAttendance.objects.filter(registration=registration, session=session).exists()
        
        if attendance_exists:
            session_name = session.title if session else "Umum"
            attended_at = EventAttendance.objects.get(registration=registration, session=session).attended_at
            attended_time = timezone.localtime(attended_at).strftime("%d %b %Y %H:%M")
            return Response({
                'status': 'already_attended',
                'message': f'Peserta sudah tercatat hadir untuk {session_name} pada {attended_time}.',
                'registration': {
                    'id': registration.id,
                    'name': registration.user.profile.name_full if registration.user and hasattr(registration.user, 'profile') else (registration.guest_name or 'Tamu'),
                    'unique_code': registration.unique_code,
                    'is_attended': True,
                }
            }, status=status.HTTP_200_OK)
        
        # Record attendance
        EventAttendance.objects.create(
            registration=registration,
            session=session,
            scanned_by=request.user
        )
        
        # Update general flags for backward compatibility
        if not registration.is_attended:
            registration.is_attended = True
            registration.attended_at = timezone.now()
            registration.save(update_fields=['is_attended', 'attended_at'])
        
        name = ''
        if registration.user:
            profile = getattr(registration.user, 'profile', None)
            name = profile.name_full if profile and profile.name_full else registration.user.username
        else:
            name = registration.guest_name or 'Tamu'
            
        session_label = session.title if session else "Acara"
        return Response({
            'status': 'success',
            'message': f'Hadir! {name} berhasil dicatat untuk {session_label}.',
            'registration': {
                'id': registration.id,
                'name': name,
                'unique_code': registration.unique_code,
                'payment_method': registration.payment_method,
                'is_attended': registration.is_attended,
                'attended_at': registration.attended_at,
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def participants(self, request, slug=None):
        """Public list of approved participants for this event."""
        event = self.get_object()
        # Remove status='approved' filter to show everyone who registered
        registrations = EventRegistration.objects.filter(event=event).prefetch_related('user', 'user__profile')
        
        # Identify team-related fields
        team_field_ids = list(event.form_fields.filter(
            Q(label__icontains='team') | 
            Q(label__icontains='tim') | 
            Q(label__icontains='kelompok') |
            Q(label__icontains='regu') |
            Q(label__icontains='group')
        ).values_list('id', flat=True))
        
        # Convert IDs to strings since JSON keys are strings
        team_field_ids = [str(fid) for fid in team_field_ids]

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
            
            # Find team value
            team = None
            if reg.responses:
                for fid in team_field_ids:
                    val = reg.responses.get(fid)
                    if val:
                        team = str(val)
                        break
                
            # Get uploaded files
            uploaded_files = []
            for f in reg.uploaded_files.all():
                uploaded_files.append({
                    "id": f.id,
                    "label": f.field.label,
                    "url": request.build_absolute_uri(f.file.url) if f.file else None
                })

            data.append({
                "id": reg.id,
                "user_id": reg.user.id if reg.user else None,
                "name": name,
                "status": reg.status,
                "team": team,
                "created_at": reg.created_at,
                "uploaded_files": uploaded_files,
            })
            
        return Response(data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def export_registrations(self, request, slug=None):
        """Export all registrations for this event as a CSV file."""
        event = self.get_object()
        
        # Verify ownership
        if not request.user.is_staff and event.created_by != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registrations = EventRegistration.objects.filter(event=event).select_related('user', 'user__profile').prefetch_related('attendances')
        form_fields = event.form_fields.all()
        sessions = event.sessions.all().order_by('order', 'start_time')
        
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="participants_{event.slug}.csv"'
        
        # Add UTF-8 BOM for Excel compatibility
        response.write('\ufeff'.encode('utf8'))
        writer = csv.writer(response, delimiter=';')
        
        # CSV Header
        header = ['ID', 'Waktu Daftar', 'ID Peserta', 'Kode Tiket', 'Nama', 'Email', 'Label User', 'Status', 'Kehadiran Umum']
        for field in form_fields:
            header.append(field.label)
        
        # Add Session Headers
        for s in sessions:
            header.append(f"Hadir: {s.title}")
            
        writer.writerow(header)
        
        # CSV Data
        from django.utils import timezone
        for reg in registrations:
            row = []
            # ID (Registration ID)
            row.append(reg.id)

            # Registration Time
            row.append(reg.created_at.strftime('%Y-%m-%d %H:%M:%S'))

            # ID Peserta
            row.append(reg.user.id if reg.user else "-")

            # Kode Tiket
            row.append(reg.unique_code or "-")
            
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

            # Label User
            labels_str = "-"
            if reg.user:
                labels_str = " | ".join([l.name for l in reg.user.labels.all()])
            row.append(labels_str)
            
            # Status
            row.append(reg.get_status_display())

            # Kehadiran Umum
            row.append("Hadir" if reg.is_attended else "Belum")
            
            # Custom Fields (Form Data)
            for field in form_fields:
                value = reg.responses.get(str(field.id))
                
                # Robust fallback for orphaned IDs
                if not value and reg.responses:
                    # If we find a key that is the label itself
                    label_key = next((k for k in reg.responses.keys() if k.lower() == field.label.lower()), None)
                    if label_key:
                        value = reg.responses[label_key]
                    # Specific legacy mapping for event #15
                    elif reg.event.id == 15:
                        legacy_map = {'Nama': '81', 'Email': '82', 'No HP': '83', 'WhatsApp': '83', 'Asal Instansi': '84', 'Jenis Kelamin': '85'}
                        old_id = legacy_map.get(field.label)
                        if old_id: value = reg.responses.get(old_id, "")

                if isinstance(value, list):
                    value = ", ".join(map(str, value))
                row.append(value or "")
            
            # Per-Session Attendance
            attendances = {att.session_id: att.attended_at for att in reg.attendances.all()}
            for s in sessions:
                attended_at = attendances.get(s.id)
                if attended_at:
                    row.append(timezone.localtime(attended_at).strftime('%Y-%m-%d %H:%M:%S'))
                else:
                    row.append("Belum Hadir")
                
            writer.writerow(row)
            
        return response

class EventRegistrationViewSet(viewsets.ModelViewSet):
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['event', 'status', 'user']

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Filter registrations by IDs and ensure the user has permission for EACH event
        # For simplicity and security, we loop or filter with complex logic
        registrations = EventRegistration.objects.filter(id__in=ids)
        
        # Check permissions for each registration (ensure they belong to events managed by searcher)
        if not (request.user.is_staff or request.user.has_menu_access('admin_events')):
            managed_events = Event.objects.filter(created_by=request.user)
            unauthorized_count = registrations.exclude(event__in=managed_events).count()
            if unauthorized_count > 0:
                return Response({"error": "Unauthorized to delete some registrations"}, status=status.HTTP_403_FORBIDDEN)
        
        count = registrations.count()
        registrations.delete()
        
        return Response({"message": f"Successfully deleted {count} registrations."}, status=status.HTTP_200_OK)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return EventRegistration.objects.none()
            
        if user.is_staff or user.has_menu_access('admin_events'):
            return EventRegistration.objects.all()
        
        # Event owners can see registrations for their events
        user_events = Event.objects.filter(created_by=user)
        return EventRegistration.objects.filter(event__in=user_events)

    def get_permissions(self):
        # Registration management only for authenticated users (Staff/Creators)
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        # Already filtered by get_queryset
        return super().list(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_admin = request.user.has_menu_access('admin_events') or request.user.is_staff
        if not (is_admin or instance.event.created_by == request.user):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        registration = self.get_object()
        # Verify ownership: Admin OR Event Creator
        is_admin = request.user.has_menu_access('admin_events') or request.user.is_staff
        if not (is_admin or registration.event.created_by == request.user):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        registration.status = 'approved'
        registration.save()
        
        # Build sessions info
        session_list = []
        for s in registration.event.sessions.all().order_by('order', 'start_time'):
            time_str = f"({s.start_time.strftime('%H:%M')} - {s.end_time.strftime('%H:%M')})" if s.start_time and s.end_time else ""
            session_list.append(f"- {s.title} {time_str}")
        sessions_str = "\n".join(session_list)

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
                    is_registration=True, # New flag to differentiate from Event submission
                    extra_details=f"Jadwal Sesi:\n{sessions_str}" if sessions_str else None
                )
        except Exception as e:
            print(f"Failed to send approval email: {e}")

        return Response({"message": "Pendaftaran disetujui."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        registration = self.get_object()
        is_admin = request.user.has_menu_access('admin_events') or request.user.is_staff
        if not (is_admin or registration.event.created_by == request.user):
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
