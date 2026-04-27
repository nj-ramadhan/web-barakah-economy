from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from rest_framework import generics, permissions, viewsets, filters
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    UserRegistrationSerializer, CustomTokenObtainPairSerializer,
    UserAdminSerializer, RoleSerializer, UserLabelSerializer
)
from .models import Role, UserLabel
from rest_framework.decorators import action
from barakah_app.utils import send_email
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
import csv
import random
import string
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from django.db.models import Q
import logging
logger = logging.getLogger('accounts')

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        
        response.data['id'] = user.id
        response.data['username'] = user.username
        response.data['email'] = user.email        
        response.data['role'] = user.role
        response.data['is_verified_member'] = user.is_verified_member
        response.data['accessible_menus'] = user.get_all_accessible_menus()

        # Inject Profile Picture
        try:
            profile = getattr(user, 'profile', None)
            response.data['picture'] = request.build_absolute_uri(profile.picture.url) if profile and profile.picture else None
        except Exception:
            response.data['picture'] = None

        return response
    
class LoginView(CustomTokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data['refresh_token']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)    

class GoogleLoginView(APIView):
    def post(self, request):
        token = request.data.get('token')
        logger.info(f"Received token: {token}")

        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.info(f"Using GOOGLE_CLIENT_ID: '{settings.GOOGLE_CLIENT_ID}'")
            id_info = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
            logger.info(f"Decoded token: {id_info}")

            email = id_info.get('email')
            name = id_info.get('name', '')
            google_picture = id_info.get('picture', '')
            logger.info(f"name: {name}")
            # Generate username yang unik jika sudah ada
            base_username = str(name).replace(" ", "_").lower() if name else email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exclude(email=email).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            logger.info(f"email: {email}, username: {username}")
            if not email:
                return Response({'error': 'Email not found in token'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'email': email,
                }
            )
            logger.info(f"User created: {created}, User: {user}")

            # Jika user baru, auto-isi data profil dari Google
            if created and name:
                try:
                    from profiles.models import Profile
                    profile, _ = Profile.objects.get_or_create(user=user)
                    if not profile.name_full:
                        profile.name_full = name
                    # Simpan URL foto Google sebagai google_picture_url (tidak download file)
                    if google_picture and not profile.picture:
                        profile.google_picture_url = google_picture
                    profile.save()
                except Exception as pe:
                    logger.warning(f"Failed to auto-fill profile on Google login: {pe}")

            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)

            try:
                profile = getattr(user, 'profile', None)
                if profile and profile.picture:
                    picture_url = request.build_absolute_uri(profile.picture.url)
                elif profile and hasattr(profile, 'google_picture_url') and profile.google_picture_url:
                    picture_url = profile.google_picture_url
                else:
                    picture_url = google_picture or None
            except Exception:
                picture_url = google_picture or None

            return Response({
                'access': access,
                'refresh': str(refresh),
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_verified_member': user.is_verified_member,
                'accessible_menus': user.get_all_accessible_menus(),
                'picture': picture_url,
                'is_new_user': created,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            logger.error(f"Google Token verification failed: {e}")
            return Response({'error': f'Invalid token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            logger.error(f"Critical error during Google login: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            frontend_url = request.data.get('frontend_url', settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000')
            reset_url = f"{frontend_url}/reset-password?uid={user.pk}&token={token}"
            try:
                subject = '[Barakah App] Reset Password Anda'
                message = f'Klik tautan berikut untuk mengatur ulang kata sandi Anda:\n\n{reset_url}\n\nTautan ini akan kedaluwarsa dalam 24 jam.\n\nJika Anda tidak meminta reset password, abaikan email ini.'
                
                send_email(
                    subject=subject,
                    message=message,
                    recipient_list=[email],
                    fail_silently=False,
                )
                logger.info(f"Password reset email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send password reset email: {e}")
                # Tetap return success agar tidak expose apakah email terdaftar
        return Response({'message': 'Jika email terdaftar, tautan reset password telah dikirim.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        if not all([uid, token, new_password]):
            return Response({'error': 'Data tidak lengkap.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(pk=uid).first()
        if user and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password berhasil diubah. Silakan login kembali.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Token tidak valid atau sudah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Endpoint untuk user mengubah password sendiri (butuh auth)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([old_password, new_password, confirm_password]):
            return Response({'error': 'Semua field wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(old_password):
            return Response({'error': 'Password lama tidak benar.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'Konfirmasi password tidak cocok.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password baru minimal 8 karakter.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password berhasil diubah.'}, status=status.HTTP_200_OK)


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD for dynamic roles. Admin only."""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAdminUser]


class UserLabelViewSet(viewsets.ModelViewSet):
    """CRUD for user labels. Admin only."""
    queryset = UserLabel.objects.all()
    serializer_class = UserLabelSerializer
    permission_classes = [permissions.IsAdminUser]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related('profile').prefetch_related('custom_roles', 'labels').order_by('-date_joined')
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        """Override create untuk support pembuatan user baru dengan password."""
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        phone = request.data.get('phone', '')
        role = request.data.get('role', 'user')
        is_verified = request.data.get('is_verified_member', False)
        name_full = request.data.get('name_full', '')

        if not username or not email or not password:
            return Response({'error': 'Username, email, dan password wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username sudah digunakan.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email sudah terdaftar.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, email=email, password=password,
            phone=phone, role=role, is_verified_member=is_verified
        )

        if name_full:
            from profiles.models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.name_full = name_full
            profile.save()

        return Response(UserAdminSerializer(user).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Search across multiple fields
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(profile__name_full__icontains=search) |
                Q(profile__address__icontains=search)
            )

        # Filter by role
        role_filter = self.request.query_params.get('role', '')
        if role_filter:
            qs = qs.filter(role=role_filter)

        # Filter by custom role
        custom_role_filter = self.request.query_params.get('custom_role', '')
        if custom_role_filter:
            qs = qs.filter(custom_roles__id=custom_role_filter)

        # Filter by label
        label_filter = self.request.query_params.get('label', '')
        if label_filter:
            qs = qs.filter(labels__id=label_filter)

        # Filter by join date range
        date_from = self.request.query_params.get('date_from', '')
        date_to = self.request.query_params.get('date_to', '')
        if date_from:
            qs = qs.filter(date_joined__date__gte=date_from)
        if date_to:
            qs = qs.filter(date_joined__date__lte=date_to)

        # Filter by verified status
        verified = self.request.query_params.get('verified', '')
        if verified == 'true':
            qs = qs.filter(is_verified_member=True)
        elif verified == 'false':
            qs = qs.filter(is_verified_member=False)

        # Sorting
        ordering = self.request.query_params.get('ordering', '-date_joined')
        allowed_orderings = [
            'username', '-username', 'email', '-email', 'role', '-role',
            'date_joined', '-date_joined', 'profile__name_full', '-profile__name_full'
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        from donations.models import Donation
        from events.models import EventRegistration
        from orders.models import OrderItem
        from courses.models import CourseEnrollment
        from digital_products.models import DigitalOrder
        from profiles.models import Profile

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_full_data.csv"'

        writer = csv.writer(response)
        headers = [
            'ID', 'Username', 'Email', 'Phone', 'Role', 'Verified Member', 'Date Joined',
            'Full Name', 'Gender', 'Birth Place', 'Birth Date', 'Registration Date',
            'Marital Status', 'Segment', 'Study Level', 'Study Campus', 'Study Faculty',
            'Study Department', 'Study Program', 'Semester', 'Start Year', 'Finish Year',
            'Address', 'Job', 'Work Field', 'Work Institution', 'Work Position', 'Salary', 'Province',
            'Custom Roles', 'Labels',
            'Aktivitas Charity', 'Aktivitas Event', 'Aktivitas Sinergy', 'Aktivitas E-Course', 'Aktivitas Digital Produk'
        ]
        writer.writerow(headers)

        province_map = dict(Profile.PROVINCE_CHOICES)

        for user in self.get_queryset():
            profile = getattr(user, 'profile', None)
            row = [
                user.id,
                user.username,
                user.email,
                user.phone,
                user.role,
                user.is_verified_member,
                user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else '',
            ]
            if profile:
                province_display = province_map.get(profile.address_province, profile.address_province) if profile.address_province else ''

                row.extend([
                    profile.name_full or '',
                    profile.get_gender_display() if profile.gender else '',
                    profile.birth_place or '',
                    profile.birth_date or '',
                    profile.registration_date or '',
                    profile.get_marital_status_display() if profile.marital_status else '',
                    profile.get_segment_display() if profile.segment else '',
                    profile.get_study_level_display() if profile.study_level else '',
                    profile.study_campus or '',
                    profile.study_faculty or '',
                    profile.study_department or '',
                    profile.study_program or '',
                    profile.study_semester or '',
                    profile.study_start_year or '',
                    profile.study_finish_year or '',
                    profile.address or '',
                    profile.get_job_display() if profile.job else '',
                    profile.get_work_field_display() if profile.work_field else '',
                    profile.work_institution or '',
                    profile.work_position or '',
                    profile.work_salary or '',
                    province_display,
                ])
            else:
                row.extend([''] * 22)
            
            # Add custom roles and labels
            row.append(', '.join([r.name for r in user.custom_roles.all()]))
            row.append(', '.join([l.name for l in user.labels.all()]))

            # Activities (Real-time)
            charity_acts = Donation.objects.filter(donor=user, payment_status='verified').values('campaign__title', 'amount')
            row.append('; '.join([f"{d['campaign__title']} (Rp {int(d['amount'] or 0):,})" for d in charity_acts]))

            event_acts = EventRegistration.objects.filter(user=user, status='approved').values_list('event__title', flat=True)
            row.append('; '.join(event_acts))

            sinergy_acts = OrderItem.objects.filter(
                order__user=user
            ).exclude(
                order__status__in=['Pending', 'pending', 'Batal', 'batal', 'Rejected', 'rejected']
            ).select_related('product', 'variation')
            row.append('; '.join([f"{item.product.title}{' ('+item.variation.name+')' if item.variation else ''} x{item.quantity}" for item in sinergy_acts]))

            course_acts = CourseEnrollment.objects.filter(user=user, payment_status__in=['verified', 'paid']).values_list('course__title', flat=True)
            row.append('; '.join(course_acts))

            digital_acts = DigitalOrder.objects.filter(buyer=user, payment_status='verified').values_list('digital_product__title', flat=True)
            row.append('; '.join(digital_acts))
            
            writer.writerow(row)

        return response

    @action(detail=False, methods=['post'])
    def blast_whatsapp(self, request):
        """Send WhatsApp message blast to selected users."""
        from .whatsapp_service import blast_messages
        user_ids = request.data.get('user_ids', [])
        message_template = request.data.get('message', '')
        image_base64 = request.data.get('image_base64')

        if not user_ids or not message_template:
            return Response(
                {'error': 'user_ids dan message wajib diisi'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = User.objects.filter(id__in=user_ids, phone__isnull=False).exclude(phone='')
        
        phone_list = []
        placeholder_data_list = []
        seen_phones = set()
        
        for u in users:
            phone = u.phone
            # Robust normalization for deduplication (anchor at '8')
            raw_digits = ''.join(filter(str.isdigit, str(phone)))
            if not raw_digits: continue
            
            if raw_digits.startswith('620'): core_number = raw_digits[3:]
            elif raw_digits.startswith('62'): core_number = raw_digits[2:]
            elif raw_digits.startswith('0'): core_number = raw_digits[1:]
            else: core_number = raw_digits
            
            if core_number not in seen_phones:
                seen_phones.add(core_number)
                
                # Format for sending
                formatted = phone
                if raw_digits.startswith('0'): formatted = "+62" + raw_digits[1:]
                elif raw_digits.startswith('8'): formatted = "+62" + raw_digits
                elif not formatted.startswith('+'): formatted = "+" + raw_digits
                
                phone_list.append(formatted)
                profile = getattr(u, 'profile', None)
                placeholder_data_list.append({
                    'name': profile.name_full if profile and profile.name_full else u.username,
                    'username': u.username,
                    'email': u.email,
                    'phone': u.phone,
                })

        if not phone_list:
            return Response(
                {'error': 'Tidak ada user dengan nomor HP yang valid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = blast_messages(phone_list, message_template, placeholder_data_list, file_data_base64=image_base64)
        return Response({
            "message": f"Blast selesai dikirim ke {result['success']} nomor unik.",
            "details": result
        })

    @action(detail=False, methods=['get'])
    def roles_list(self, request):
        """Get all available roles for filter dropdown."""
        roles = Role.objects.filter(is_active=True)
        return Response(RoleSerializer(roles, many=True).data)

    @action(detail=False, methods=['get'])
    def labels_list(self, request):
        """Get all available labels for filter dropdown."""
        labels = UserLabel.objects.all()
        return Response(UserLabelSerializer(labels, many=True).data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin reset password user – generate password sementara."""
        user = self.get_object()
        # Generate password sementara 10 karakter
        chars = string.ascii_letters + string.digits
        temp_password = ''.join(random.choices(chars, k=10))
        user.set_password(temp_password)
        user.save()
        logger.info(f"Admin {request.user.username} reset password for user {user.username}")
        return Response({
            'message': f'Password user @{user.username} berhasil direset.',
            'temp_password': temp_password,
            'username': user.username,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def batch_update(self, request):
        """Batch update selected users."""
        user_ids = request.data.get('user_ids', [])
        field = request.data.get('field')
        value = request.data.get('value')

        if not user_ids or not field:
            return Response({'error': 'user_ids and field are required'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            users = User.objects.filter(id__in=user_ids)
            
            # User model fields
            if field in ['role', 'is_verified_member']:
                users.update(**{field: value})
            
            # ManyToMany fields
            elif field == 'custom_role_ids':
                for user in users:
                    user.custom_roles.set(value)
            elif field == 'label_ids':
                for user in users:
                    user.labels.set(value)
            
            # Profile model fields
            else:
                from profiles.models import Profile
                profile_fields = [f.name for f in Profile._meta.get_fields()]
                if field in profile_fields:
                    for user in users:
                        profile, _ = Profile.objects.get_or_create(user=user)
                        setattr(profile, field, value)
                        profile.save()
                else:
                    return Response({'error': f'Invalid field: {field}'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'message': f'Successfully updated {users.count()} users.'})
