# profiles/views.py
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework import status
from .models import Profile
from .serializers import ProfileSerializer

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

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
       