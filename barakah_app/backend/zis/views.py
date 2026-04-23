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

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="rekap_zis.csv"'
        
        writer = csv.writer(response)
        # Header
        writer.writerow(['Tanggal Input', 'Periode Bulan', 'Username', 'Nama Lengkap', 'Kategori', 'Nominal', 'Total', 'Status'])
        
        submissions = ZISSubmission.objects.all().order_by('-created_at')
        for s in submissions:
            created_at = s.created_at.strftime('%Y-%m-%d %H:%M')
            full_name = s.user.get_full_name()
            # Flatten categories for CSV
            for cat, val in s.values.items():
                if float(val) > 0:
                    writer.writerow([created_at, s.month, s.user.username, full_name, cat, val, s.total_amount, s.status])
                    
        return response
