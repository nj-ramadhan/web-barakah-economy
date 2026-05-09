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

from .models import Meeting, MeetingSession, MeetingParticipant, SessionAttendance
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
        session_id = request.data.get('session_id')
        status_val = request.data.get('status')
        remarks = request.data.get('remarks')

        try:
            participant = MeetingParticipant.objects.get(id=participant_id, meeting=meeting)
            
            if session_id:
                # Per-session attendance
                attendance, created = SessionAttendance.objects.get_or_create(
                    participant=participant,
                    session_id=session_id
                )
                attendance.status = status_val
                if remarks is not None:
                    attendance.remarks = remarks
                attendance.marked_by = request.user
                attendance.save()
                return Response({"message": "Kehadiran sesi berhasil diperbarui."})
            else:
                # Global attendance (legacy/fallback)
                participant.status = status_val
                if remarks is not None:
                    participant.remarks = remarks
                participant.marked_at = timezone.now()
                participant.marked_by = request.user
                participant.save()
                return Response({"message": "Kehadiran global berhasil diperbarui."})
        except MeetingParticipant.DoesNotExist:
            return Response({"error": "Peserta tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    @action(detail=True, methods=['post'])
    def mark_session_finished(self, request, slug=None):
        meeting = self.get_object()
        session_id = request.data.get('session_id')
        
        try:
            session = MeetingSession.objects.get(id=session_id, meeting=meeting)
            session.is_finished = True
            session.save()
            
            # Find next session
            next_session = MeetingSession.objects.filter(
                meeting=meeting,
                order__gt=session.order
            ).order_by('order', 'start_time').first()
            
            if not next_session:
                # If orders are equal or 0, check by start_time
                next_session = MeetingSession.objects.filter(
                    meeting=meeting,
                    start_time__gt=session.start_time
                ).order_by('start_time').first()

            if next_session:
                # Automatic blast for next session
                self._blast_next_session(meeting, next_session)
                return Response({
                    "message": f"Sesi '{session.title}' selesai. Reminder untuk sesi berikutnya '{next_session.title}' telah dikirim.",
                    "next_session": next_session.title
                })
            
            return Response({"message": f"Sesi '{session.title}' selesai. Tidak ada sesi berikutnya."})
        except MeetingSession.DoesNotExist:
            return Response({"error": "Sesi tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

    def _blast_next_session(self, meeting, next_session):
        participants = meeting.participants.all().select_related('user', 'user__profile')
        phone_list = []
        
        session_time = timezone.localtime(next_session.start_time).strftime('%d %b %Y %H:%M') if next_session.start_time else "Segera"
        if next_session.end_time:
            session_time += f" - {timezone.localtime(next_session.end_time).strftime('%H:%M')}"

        message = (
            f"🔔 *Peringatan Sesi Berikutnya*\n\n"
            f"Rapat: *{meeting.title}*\n"
            f"Sesi: *{next_session.title}*\n"
            f"Waktu: {session_time}\n"
            f"Lokasi: {meeting.location}\n\n"
            f"Mohon kesediaannya untuk segera bergabung kembali.\n\n"
            f"Detail: https://barakah.cloud/meetings/{meeting.slug}"
        )

        for p in participants:
            profile = getattr(p.user, 'profile', None)
            phone = profile.phone if profile else None
            if phone:
                digits = ''.join(filter(str.isdigit, str(phone)))
                if digits.startswith('0'): digits = '62' + digits[1:]
                elif digits.startswith('8'): digits = '62' + digits
                phone_list.append(digits)
        
        if phone_list:
            try:
                whatsapp_service.blast_messages(phone_list, message, [])
            except Exception as e:
                logger.error(f"Error blasting next session reminder: {str(e)}")
    @action(detail=True, methods=['post'])
    def blast_whatsapp(self, request, slug=None):
        try:
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
                profile = getattr(p.user, 'profile', None)
                if profile:
                    phone = profile.phone
                    if profile.name_full:
                        name = profile.name_full
                
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
                        'meeting_link': f"https://barakah.cloud/meetings/{meeting.slug}"
                    })

            if not phone_list:
                return Response({"error": "Tidak ada nomor WhatsApp peserta yang valid."}, status=status.HTTP_400_BAD_REQUEST)

            result = whatsapp_service.blast_messages(phone_list, custom_message, placeholder_data)
            return Response({"message": f"Blast terkirim ke {result['success']} peserta.", "details": result})
        except Exception as e:
            import traceback
            logger.error(f"Error in meeting blast_whatsapp: {str(e)}\n{traceback.format_exc()}")
            return Response({
                "error": "Internal Server Error (Meeting Blast)",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def export_csv(self, request, slug=None):
        meeting = self.get_object()
        sessions = meeting.sessions.all().order_by('order', 'start_time')
        participants = meeting.participants.all().select_related('user', 'user__profile')
        
        # Pre-fetch session attendance to avoid N+1
        attendances = SessionAttendance.objects.filter(participant__meeting=meeting).select_related('participant', 'session')
        attendance_map = {} # (participant_id, session_id) -> status/remarks
        for att in attendances:
            attendance_map[(att.participant_id, att.session_id)] = {
                'status': att.get_status_display(),
                'remarks': att.remarks or ""
            }

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="rapat_{meeting.slug}.csv"'
        
        # BOM for Excel
        response.write('\ufeff'.encode('utf8'))
        writer = csv.writer(response, delimiter=';')
        
        header = ['ID', 'Username', 'Nama Lengkap', 'Email', 'No HP']
        for s in sessions:
            header.append(f"Sesi: {s.title}")
            header.append(f"Ket: {s.title}")
        header.extend(['Waktu Gabung', 'Global Status', 'Global Remarks'])
        
        writer.writerow(header)
        
        for p in participants:
            profile = getattr(p.user, 'profile', None)
            row = [
                p.user.id,
                p.user.username,
                profile.name_full if profile else "-",
                p.user.email,
                profile.phone if profile else "-",
            ]
            
            for s in sessions:
                att = attendance_map.get((p.id, s.id), {'status': 'Belum Diabsen', 'remarks': '-'})
                row.append(att['status'])
                row.append(att['remarks'])
                
            row.extend([
                p.joined_at.strftime('%Y-%m-%d %H:%M:%S'),
                p.get_status_display(),
                p.remarks or "-"
            ])
            writer.writerow(row)
            
        return response
