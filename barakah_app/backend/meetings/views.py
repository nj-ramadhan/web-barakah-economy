from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse
from django.conf import settings
from django.db.models import Q
import csv
import json
import logging

from .models import Meeting, MeetingSession, MeetingParticipant
from .serializers import MeetingSerializer, MeetingSessionSerializer, MeetingParticipantSerializer
from accounts.models import User
from accounts import whatsapp_service

logger = logging.getLogger(__name__)

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all().order_by('-start_date')
    serializer_class = MeetingSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'subtitle', 'description', 'location']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Admin can see everything, or if they have the internal_meetings menu access
            if user.is_staff or user.role == 'admin' or user.has_menu_access('internal_meetings'):
                return Meeting.objects.all().order_by('-start_date')
            # Otherwise only meetings they created
            return Meeting.objects.filter(created_by=user).order_by('-start_date')
        return Meeting.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'manage_participants', 'blast_whatsapp', 'export_csv', 'update_attendance']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _get_parsed_data(self, request):
        if hasattr(request.data, 'dict'):
            data = request.data.dict()
        else:
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        if 'sessions' in data and isinstance(data['sessions'], str):
            try:
                data['sessions'] = json.loads(data['sessions'])
            except:
                pass
        return data

    def create(self, request, *args, **kwargs):
        data = self._get_parsed_data(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = self._get_parsed_data(request)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def participants(self, request, slug=None):
        meeting = self.get_object()
        participants = meeting.participants.all().select_related('user', 'user__profile')
        serializer = MeetingParticipantSerializer(participants, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_participants(self, request, slug=None):
        meeting = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response({"error": "Pilih minimal satu user."}, status=status.HTTP_400_BAD_REQUEST)
        
        added_count = 0
        for user_id in user_ids:
            participant, created = MeetingParticipant.objects.get_or_create(
                meeting=meeting,
                user_id=user_id
            )
            if created:
                added_count += 1
        
        return Response({"message": f"Berhasil menambahkan {added_count} peserta baru."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def update_attendance(self, request, slug=None):
        meeting = self.get_object()
        participant_id = request.data.get('participant_id')
        status_val = request.data.get('status')
        remarks = request.data.get('remarks')

        try:
            participant = MeetingParticipant.objects.get(id=participant_id, meeting=meeting)
            participant.status = status_val
            if remarks is not None:
                participant.remarks = remarks
            participant.marked_at = timezone.now()
            participant.marked_by = request.user
            participant.save()
            return Response({"message": "Kehadiran berhasil diperbarui."})
        except MeetingParticipant.DoesNotExist:
            return Response({"error": "Peserta tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def blast_whatsapp(self, request, slug=None):
        meeting = self.get_object()
        custom_message = request.data.get('message')
        participant_ids = request.data.get('participant_ids') # Optional list of participant IDs

        if not custom_message:
            return Response({"error": "Pesan tidak boleh kosong."}, status=status.HTTP_400_BAD_REQUEST)

        if participant_ids:
            participants = meeting.participants.filter(id__in=participant_ids).select_related('user', 'user__profile')
        else:
            participants = meeting.participants.all().select_related('user', 'user__profile')

        phone_list = []
        placeholder_data = []
        
        # Prepare placeholders
        meeting_time_str = timezone.localtime(meeting.start_date).strftime('%d %b %Y %H:%M')
        if meeting.end_date:
            meeting_time_str += f" - {timezone.localtime(meeting.end_date).strftime('%H:%M')}"

        for p in participants:
            phone = None
            name = p.user.username
            if hasattr(p.user, 'profile'):
                phone = p.user.profile.phone
                if p.user.profile.name_full:
                    name = p.user.profile.name_full
            
            if phone:
                # Basic normalization
                digits = ''.join(filter(str.isdigit, str(phone)))
                if digits.startswith('0'): digits = '62' + digits[1:]
                elif digits.startswith('8'): digits = '62' + digits
                
                phone_list.append(digits)
                placeholder_data.append({
                    'name': name,
                    'meeting_title': meeting.title,
                    'time': meeting_time_str,
                    'location': meeting.location,
                })

        if not phone_list:
            return Response({"error": "Tidak ada nomor WhatsApp peserta yang valid."}, status=status.HTTP_400_BAD_REQUEST)

        result = whatsapp_service.blast_messages(phone_list, custom_message, placeholder_data)
        return Response({"message": f"Blast terkirim ke {result['success']} peserta.", "details": result})

    @action(detail=True, methods=['get'])
    def export_csv(self, request, slug=None):
        meeting = self.get_object()
        participants = meeting.participants.all().select_related('user', 'user__profile')

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="rapat_{meeting.slug}.csv"'
        
        # BOM for Excel
        response.write('\ufeff'.encode('utf8'))
        writer = csv.writer(response, delimiter=';')
        
        writer.writerow(['ID', 'Username', 'Nama Lengkap', 'Email', 'No HP', 'Status Kehadiran', 'Keterangan', 'Waktu Gabung', 'Waktu Diabsen', 'Diabsen Oleh'])
        
        for p in participants:
            profile = getattr(p.user, 'profile', None)
            row = [
                p.user.id,
                p.user.username,
                profile.name_full if profile else "-",
                p.user.email,
                profile.phone if profile else "-",
                p.get_status_display(),
                p.remarks or "-",
                p.joined_at.strftime('%Y-%m-%d %H:%M:%S'),
                p.marked_at.strftime('%Y-%m-%d %H:%M:%S') if p.marked_at else "-",
                p.marked_by.username if p.marked_by else "-"
            ]
            writer.writerow(row)
            
        return response
