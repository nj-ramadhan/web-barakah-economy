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
from django.http import HttpResponse
import csv
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
            id_info = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
            logger.info(f"Decoded token: {id_info}")

            email = id_info.get('email')
            name = id_info.get('name')
            first_name = id_info.get('given_name')
            last_name = id_info.get('family_name')
            logger.info(f"name: {name}")
            username = str(name).replace(" ", "_").lower()
            logger.info(f"email: {email}, name: {username}")
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

            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)

            return Response({
                'access': access,
                'refresh': str(refresh),
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_verified_member': user.is_verified_member,
                'accessible_menus': user.get_all_accessible_menus(),
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            logger.error(f"Token verification failed: {e}")
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error during Google login: {e}")
            return Response({'error': 'An error occurred during Google login'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            reset_url = f"{request.data.get('frontend_url')}/reset-password?uid={user.pk}&token={token}"
            send_mail(
                'Reset Password',
                f'Click the link to reset your password: {reset_url}',
                'no-reply@yourdomain.com',
                [email],
            )
        return Response({'message': 'If the email exists, a reset link has been sent.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        user = User.objects.filter(pk=uid).first()
        if user and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid token or user.'}, status=status.HTTP_400_BAD_REQUEST)


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

        return qs.distinct()

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_full_data.csv"'

        writer = csv.writer(response)
        headers = [
            'ID', 'Username', 'Email', 'Phone', 'Role', 'Verified Member', 'Date Joined',
            'Full Name', 'Gender', 'Birth Place', 'Birth Date', 'Registration Date',
            'Marital Status', 'Segment', 'Study Level', 'Study Campus', 'Study Faculty',
            'Study Department', 'Study Program', 'Semester', 'Start Year', 'Finish Year',
            'Address', 'Job', 'Work Field', 'Work Institution', 'Work Position', 'Salary', 'Province',
            'Custom Roles', 'Labels'
        ]
        writer.writerow(headers)

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
                    profile.get_address_province_display() if profile.address_province else '',
                ])
            else:
                row.extend([''] * 22)
            
            # Add custom roles and labels
            row.append(', '.join([r.name for r in user.custom_roles.all()]))
            row.append(', '.join([l.name for l in user.labels.all()]))
            
            writer.writerow(row)

        return response

    @action(detail=False, methods=['post'])
    def blast_whatsapp(self, request):
        """Send WhatsApp message blast to selected users."""
        from .whatsapp_service import blast_messages

        user_ids = request.data.get('user_ids', [])
        message_template = request.data.get('message', '')

        if not user_ids or not message_template:
            return Response(
                {'error': 'user_ids dan message wajib diisi'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = User.objects.filter(id__in=user_ids, phone__isnull=False).exclude(phone='')
        
        phone_list = []
        placeholder_data_list = []
        for u in users:
            phone_list.append(u.phone)
            profile = getattr(u, 'profile', None)
            placeholder_data_list.append({
                'name': profile.name_full if profile else u.username,
                'username': u.username,
                'email': u.email,
                'phone': u.phone,
            })

        if not phone_list:
            return Response(
                {'error': 'Tidak ada user dengan nomor HP yang valid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = blast_messages(phone_list, message_template, placeholder_data_list)
        return Response(result)

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
