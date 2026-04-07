from rest_framework.decorators import api_view, permission_classes, parser_classes, action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework import status
from django.db.models import Q
from .models import Profile
from .serializers import ProfileSerializer

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response([])
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(
            Q(username__icontains=query) | Q(email__icontains=query)
        )[:10]
        
        results = [
            {'id': u.id, 'username': u.username, 'email': u.email}
            for u in users
        ]
        return Response(results)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request, user_id):
    try:
        profile = Profile.objects.get(user_id=user_id)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def profile_update(request, user_id):
    # Ensure user can only update their own profile unless admin
    if str(request.user.id) != str(user_id) and request.user.role != 'admin':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    try:
        profile = Profile.objects.get(user_id=user_id)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_completeness_check(request):
    """Check if user must complete profile before accessing features.
    Users with role=user and no custom_role must complete basic KTP fields."""
    user = request.user

    # Admin/staff/seller bypass
    if user.role in ('admin', 'staff', 'seller'):
        return Response({'requires_completion': False, 'is_complete': True, 'missing_fields': [], 'has_custom_role': True})

    # Always check against the required fields for "anggota_bae"
    from accounts.models import Role
    required_fields = set()
    try:
        anggota_role = Role.objects.get(code='anggota_bae')
        required_fields.update(anggota_role.required_profile_fields or [])
    except Role.DoesNotExist:
        # Fallback if the role doesn't exist
        required_fields = {'name_full', 'nik', 'gender', 'birth_place', 'birth_date', 'address', 'address_province'}

    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return Response({
            'requires_completion': True, 'is_complete': False,
            'missing_fields': list(required_fields)
        })

    # DYNAMIC RULE: Adjust required fields based on segment and study_level
    segment = profile.segment
    study_level = profile.study_level

    # If segment is required, force the sub-fields to be required based on what segment is chosen
    if 'segment' in required_fields:
        if segment in ['karyawan', 'umum', 'pengusaha']:
            # Job is mandatory
            required_fields.update({'job', 'work_field', 'work_institution', 'work_position', 'work_salary'})
            # Study is optional for UMUM but if they fill it, require campus
            if study_level:
                required_fields.update({'study_campus'})
                if study_level not in ['sd', 'smp', 'sma']:
                    required_fields.update({'study_faculty', 'study_department', 'study_program', 'study_semester'})
        elif segment in ['mahasiswa', 'pelajar', 'santri']:
            # Education is mandatory
            required_fields.update({'study_level', 'study_campus'})
            if study_level and study_level not in ['sd', 'smp', 'sma']:
                required_fields.update({'study_faculty', 'study_department', 'study_program', 'study_semester'})

    # If segment is Pelajar/Mahasiswa/Santri -> Ignore work fields
    if segment in ['mahasiswa', 'pelajar', 'santri']:
        required_fields = {f for f in required_fields if not f.startswith('work_') and f != 'job'}

    # If study_level is SMA or below -> Ignore higher-ed fields
    if study_level in ['sd', 'smp', 'sma']:
        ignored_study_fields = {'study_faculty', 'study_department', 'study_program', 'study_semester'}
        required_fields = {f for f in required_fields if f not in ignored_study_fields}

    missing = []
    for field in required_fields:
        val = getattr(profile, field, None)
        if not val or (isinstance(val, str) and not val.strip()):
            missing.append(field)

    return Response({
        'requires_completion': len(missing) > 0,
        'is_complete': len(missing) == 0,
        'missing_fields': missing,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def scan_ktp(request):
    """Accept a KTP image and return extracted data using OCR."""
    from .ktp_service import extract_ktp_data

    image = request.FILES.get('ktp_image')
    if not image:
        return Response({'error': 'ktp_image file wajib diupload'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if image.content_type not in allowed_types:
        return Response({'error': 'Format file harus JPG, PNG, atau WebP'}, status=status.HTTP_400_BAD_REQUEST)

    result = extract_ktp_data(image)
    return Response(result)