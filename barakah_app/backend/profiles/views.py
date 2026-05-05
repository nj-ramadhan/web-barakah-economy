from rest_framework.decorators import api_view, permission_classes, parser_classes, action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework import status
from django.db.models import Q
from .models import Profile, BusinessProfile
from .serializers import ProfileSerializer, BusinessProfileSerializer
import logging

logger = logging.getLogger(__name__)

class BusinessProfileViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        try:
            user = self.request.user
            if user.is_anonymous:
                return BusinessProfile.objects.none()
                
            if user.role == 'admin':
                qs = BusinessProfile.objects.all().order_by('-created_at')
            else:
                qs = BusinessProfile.objects.filter(user=user).order_by('-created_at')
            
            list(qs[:1]) 
            return qs
        except Exception as e:
            logger.error(f"Error in BusinessProfileViewSet.get_queryset: {str(e)}")
            return BusinessProfile.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['seller', 'admin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Hanya anggota BAE Community yang dapat mengisi data usaha.")
            
        serializer.save(user=user)

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'user'

    def perform_update(self, serializer):
        profile = serializer.save()
        profile.check_auto_roles()

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        try:
            # Gunakan select_related agar pengambilan data user lebih cepat
            profile = Profile.objects.select_related('user').filter(user=request.user).first()
            
            # Jika profil belum ada (misal: migrasi lama), buatkan sekarang
            if not profile:
                profile = Profile.objects.create(user=request.user)
            
            if request.method == 'PATCH':
                serializer = self.get_serializer(profile, data=request.data, partial=True)
                if serializer.is_valid():
                    profile = serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in Profile me: {str(e)}", exc_info=True)
            return Response({'error': f'Database or Server Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='check-completeness')
    def check_completeness(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile = Profile.objects.filter(user=user).first()
        is_complete = False
        missing_fields = []
        
        if profile:
            fields_to_check = ['name_full', 'address', 'bio', 'weight', 'height']
            for field in fields_to_check:
                if not getattr(profile, field):
                    missing_fields.append(field)
            
            is_complete = len(missing_fields) == 0
            
        return Response({
            'is_complete': is_complete,
            'missing_fields': missing_fields
        })

@api_view(['GET'])
def profile_view(request, user_id):
    try:
        profile = Profile.objects.get(user_id=user_id)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)

@api_view(['POST'])
def profile_update(request, user_id):
    try:
        profile = Profile.objects.get(user_id=user_id)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)