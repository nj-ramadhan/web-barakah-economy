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