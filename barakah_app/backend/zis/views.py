from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ZISConfig, ZISSubmission
from .serializers import ZISConfigSerializer, ZISSubmissionSerializer

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsStaffOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['staff', 'admin']

class ZISConfigViewSet(viewsets.ModelViewSet):
    queryset = ZISConfig.objects.all()
    serializer_class = ZISConfigSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        config = ZISConfig.objects.filter(is_active=True).first()
        if not config:
            return Response({"error": "No active configuration found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(config)
        return Response(serializer.data)

class ZISSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = ZISSubmissionSerializer

    def get_permissions(self):
        if self.action in ['create', 'list', 'retrieve']:
            return [IsStaffOrAdmin()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ZISSubmission.objects.all()
        return ZISSubmission.objects.filter(user=user)

    def perform_create(self, serializer):
        import json
        values = self.request.data.get('values')
        if isinstance(values, str):
            try:
                values = json.loads(values)
            except:
                values = {}
        serializer.save(user=self.request.user, values=values)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        submission = self.get_object()
        submission.status = 'verified'
        submission.save()
        return Response({'status': 'verified'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        submission = self.get_object()
        submission.status = 'rejected'
        submission.rejection_reason = request.data.get('reason', '')
        submission.save()
        return Response({'status': 'rejected'})
