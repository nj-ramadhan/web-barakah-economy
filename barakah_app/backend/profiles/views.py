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

@api_view(['PUT'])
@parser_classes([MultiPartParser, FormParser])  # Add parsers for file uploads
def profile_update(request, user_id):
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

    has_custom_role = user.custom_roles.filter(is_active=True).exists()

    # Gather required fields from custom roles, or use defaults
    if has_custom_role:
        required_fields = set()
        for role in user.custom_roles.filter(is_active=True):
            required_fields.update(role.required_profile_fields or [])
    else:
        # Default mandatory fields for users without custom role
        required_fields = {'name_full', 'gender', 'birth_place', 'birth_date', 'address', 'address_province'}

    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return Response({
            'requires_completion': True, 'is_complete': False,
            'missing_fields': list(required_fields), 'has_custom_role': has_custom_role,
        })

    missing = []
    for field in required_fields:
        val = getattr(profile, field, None)
        if not val or (isinstance(val, str) and not val.strip()):
            missing.append(field)

    return Response({
        'requires_completion': not has_custom_role or len(missing) > 0,
        'is_complete': len(missing) == 0,
        'missing_fields': missing,
        'has_custom_role': has_custom_role,
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