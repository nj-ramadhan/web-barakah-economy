import os
import uuid
import requests as http_requests
from datetime import datetime, timedelta
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken

from .models import StreamingSettings, StreamingRecording, StreamingChat, StreamingLike, StreamingViewer, EventStreamNotification
from .serializers import (
    StreamingSettingsSerializer, 
    StreamingRecordingSerializer, 
    StreamingChatSerializer
)
from events.models import Event, EventRegistration

class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Allow read-only for public, full access for admin users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class IsAdminUser(permissions.BasePermission):
    """
    Allow access only to admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

def get_whip_urls(request, settings_obj):
    host = request.get_host()
    is_local = 'localhost' in host or '127.0.0.1' in host or '192.168.' in host
    
    if is_local:
        whip_url = f"http://localhost:8889/{settings_obj.stream_key}/whip"
        hls_url = f"http://localhost:8888/{settings_obj.stream_key}/index.m3u8"
    else:
        # On VPS, we use Nginx proxy over HTTPS/SSL (Nginx on api.barakah.cloud terminates SSL)
        whip_url = f"https://{host}/whip/{settings_obj.stream_key}/whip"
        hls_url = f"/hls/{settings_obj.stream_key}/index.m3u8"
        
    return whip_url, hls_url


# --- 1. SETTINGS VIEW ---
class StreamingSettingsView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, event_id=None):
        if event_id:
            event_obj = get_object_or_404(Event, id=event_id)
            obj, created = StreamingSettings.objects.get_or_create(event=event_obj)
            if created or not obj.stream_key or obj.stream_key == "barakah_stream_key":
                obj.stream_key = f"bae_ev_{event_obj.id}_{uuid.uuid4().hex[:8]}"
                obj.save()
            return obj
        else:
            obj, created = StreamingSettings.objects.get_or_create(id=1, defaults={'event': None})
            if created or not obj.stream_key or obj.stream_key == "barakah_stream_key":
                obj.stream_key = f"bae_{uuid.uuid4().hex[:12]}"
                obj.save()
            return obj

    def get(self, request):
        event_id = request.query_params.get('event_id')
        settings_obj = self.get_object(event_id)
        user = request.user
        
        # Check registration requirement
        registration_required = settings_obj.require_registration
        is_registered = False
        is_admin = user and user.is_authenticated and user.role == 'admin'
        
        if registration_required and not is_admin:
            if not user or not user.is_authenticated:
                return Response({
                    'id': settings_obj.id,
                    'is_live': settings_obj.is_live,
                    'title': settings_obj.title,
                    'require_registration': True,
                    'is_registered': False,
                    'detail': 'Anda harus login dan mendaftar untuk menonton siaran ini.'
                }, status=status.HTTP_200_OK)
            
            is_registered = EventRegistration.objects.filter(
                event=settings_obj.event, 
                user=user, 
                status='approved'
            ).exists()
            
            if not is_registered:
                return Response({
                    'id': settings_obj.id,
                    'is_live': settings_obj.is_live,
                    'title': settings_obj.title,
                    'require_registration': True,
                    'is_registered': False,
                    'detail': 'Anda harus mendaftar event ini untuk menonton siaran langsung.'
                }, status=status.HTTP_200_OK)

        # Check if the HLS playlist file exists on VPS to detect if OBS is active
        hls_file_path = os.path.join(settings.MEDIA_ROOT, 'live', f"{settings_obj.stream_key}.m3u8")
        is_obs_active = os.path.exists(hls_file_path)
        
        # Cleanup inactive viewers and count total active sessions for this specific stream key
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(stream_key=settings_obj.stream_key, last_seen__lt=cutoff).delete()
        viewer_count = StreamingViewer.objects.filter(stream_key=settings_obj.stream_key).count()
        
        whip_url, _ = get_whip_urls(request, settings_obj)
        data = {
            'id': settings_obj.id,
            'is_live': settings_obj.is_live,
            'title': settings_obj.title,
            'description': settings_obj.description,
            'latency_mode': settings_obj.latency_mode,
            'save_recording': settings_obj.save_recording,
            'thumbnail': settings_obj.thumbnail.url if settings_obj.thumbnail else None,
            'updated_at': settings_obj.updated_at,
            'is_obs_active': is_obs_active,
            'viewer_count': viewer_count,
            'is_hp_streaming_active': settings_obj.is_hp_streaming_active,
            'whip_hls_url': settings_obj.whip_hls_url,
            'orientation': settings_obj.orientation,
            'require_registration': registration_required,
            'is_registered': True,
        }
        
        if is_admin or settings_obj.is_live:
            data['stream_key'] = settings_obj.stream_key
            if settings_obj.is_hp_streaming_active:
                data['hls_url'] = settings_obj.whip_hls_url
            else:
                data['hls_url'] = f"/media/live/{settings_obj.stream_key}.m3u8"
        
        if is_admin:
            data['rtmp_url'] = "rtmp://barakah.cloud:1935/live"
            data['whip_url'] = whip_url
            
        return Response(data)

    def patch(self, request):
        # Only admin can modify settings
        if not request.user or not request.user.is_authenticated or request.user.role != 'admin':
            return Response({"detail": "Hanya admin yang dapat mengubah pengaturan streaming."}, status=status.HTTP_403_FORBIDDEN)
            
        event_id = request.query_params.get('event_id')
        settings_obj = self.get_object(event_id)
        
        # Reset chat and likes when a new stream starts (toggled from offline/False to live/True)
        is_live_before = settings_obj.is_live
        is_live_now = request.data.get('is_live', is_live_before)
        if not is_live_before and is_live_now:
            StreamingChat.objects.filter(stream_key=settings_obj.stream_key).delete()
            StreamingLike.objects.filter(stream_key=settings_obj.stream_key).delete()
            
            # Send notifications to users registered for this event
            if settings_obj.event:
                user_ids = EventRegistration.objects.filter(
                    event=settings_obj.event,
                    status='approved',
                    user__isnull=False
                ).values_list('user_id', flat=True).distinct()
                
                notifications = [
                    EventStreamNotification(
                        recipient_id=user_id,
                        event=settings_obj.event,
                        stream_settings=settings_obj
                    )
                    for user_id in user_ids
                ]
                EventStreamNotification.objects.bulk_create(notifications)
            
        # Clean up or sync recording when stream ends (toggled from live/True to offline/False)
        if is_live_before and not is_live_now:
            should_save = request.data.get('save_recording', settings_obj.save_recording)
            recordings_dir = os.path.join(settings.MEDIA_ROOT, 'recordings')
            if os.path.exists(recordings_dir):
                files = os.listdir(recordings_dir)
                for file in files:
                    # Match if the file corresponds to this stream_key
                    if file.startswith(settings_obj.stream_key) and (file.endswith('_recorded.flv') or file.endswith('.mp4')):
                        if not StreamingRecording.objects.filter(file_name=file).exists():
                            if not should_save:
                                # DISCARD: physically delete the unsynced recording file to save disk space
                                try:
                                    os.remove(os.path.join(recordings_dir, file))
                                except:
                                    pass
                            else:
                                # SAVE: automatically register the unsynced recording in the database
                                title = f"Rekaman: {settings_obj.title}"
                                try:
                                    parts = file.split('_')
                                    for p in parts:
                                        if p.isdigit() and len(p) >= 9:
                                            epoch = int(p)
                                            dt = datetime.fromtimestamp(epoch)
                                            title = f"Streaming {dt.strftime('%d %b %Y - %H:%M')} ({settings_obj.title})"
                                            break
                                except:
                                    pass
                                
                                try:
                                    filesize = os.path.getsize(os.path.join(recordings_dir, file))
                                    StreamingRecording.objects.create(
                                        title=title,
                                        file_name=file,
                                        file_size=filesize
                                    )
                                except:
                                    pass
            
        serializer = StreamingSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        """
        POST to /api/streaming/settings/ will regenerate the stream key.
        Only admin can perform this action.
        """
        if not request.user or not request.user.is_authenticated or request.user.role != 'admin':
            return Response({"detail": "Hanya admin yang dapat meregenerasi stream key."}, status=status.HTTP_403_FORBIDDEN)
            
        event_id = request.query_params.get('event_id')
        settings_obj = self.get_object(event_id)
        
        # If HP stream was active, force-stop it when key is regenerated
        if settings_obj.is_hp_streaming_active:
            settings_obj.is_hp_streaming_active = False
            settings_obj.whip_hls_url = ""
        
        if event_id:
            settings_obj.stream_key = f"bae_ev_{event_id}_{uuid.uuid4().hex[:8]}"
        else:
            settings_obj.stream_key = f"bae_{uuid.uuid4().hex[:12]}"
        settings_obj.save()
        whip_url, _ = get_whip_urls(request, settings_obj)
        return Response({
            "message": "Stream Key berhasil diregenerasi.",
            "stream_key": settings_obj.stream_key,
            "hls_url": f"/media/live/{settings_obj.stream_key}.m3u8",
            "whip_url": whip_url
        })



# --- 2. CHAT / COMMENTS VIEW ---
class StreamingChatViewSet(viewsets.ModelViewSet):
    queryset = StreamingChat.objects.all().select_related('user', 'user__profile')
    serializer_class = StreamingChatSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        stream_key = self.request.query_params.get('stream_key')
        if stream_key:
            qs = qs.filter(stream_key=stream_key)
        return qs

    def perform_create(self, serializer):
        stream_key = self.request.data.get('stream_key', 'barakah_stream_key')
        
        # Check if registration is required for this stream
        try:
            from rest_framework.exceptions import ValidationError
            
            stream = StreamingSettings.objects.filter(stream_key=stream_key).first()
            if stream and stream.require_registration and stream.event:
                user = self.request.user
                event = stream.event
                
                # Check permissions: staff, superuser, event creator, committee, or approved participant
                is_allowed = (
                    user.is_staff or 
                    user.is_superuser or 
                    event.created_by == user or 
                    event.committees.filter(id=user.id).exists() or
                    EventRegistration.objects.filter(event=event, user=user, status='approved').exists()
                )
                if not is_allowed:
                    raise ValidationError("Hanya peserta terdaftar yang disetujui yang dapat mengirim komentar.")
        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            print(f"Error checking registration for streaming chat: {e}")

        serializer.save(user=self.request.user, stream_key=stream_key)


# --- 3. LIKES VIEW ---
class StreamingLikeView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        stream_key = request.query_params.get('stream_key', 'barakah_stream_key')
        total_likes = StreamingLike.objects.filter(stream_key=stream_key).count()
        user_has_liked = False
        if request.user and request.user.is_authenticated:
            user_has_liked = StreamingLike.objects.filter(stream_key=stream_key, user=request.user).exists()
            
        return Response({
            "total_likes": total_likes,
            "has_liked": user_has_liked
        })

    def post(self, request):
        stream_key = request.data.get('stream_key', 'barakah_stream_key')
        user = request.user
        like_filter = StreamingLike.objects.filter(stream_key=stream_key, user=user)
        
        if like_filter.exists():
            like_filter.delete()
            liked = False
        else:
            StreamingLike.objects.create(user=user, stream_key=stream_key)
            liked = True
            
        total_likes = StreamingLike.objects.filter(stream_key=stream_key).count()
        return Response({
            "status": "success",
            "liked": liked,
            "total_likes": total_likes
        })


# --- 4. RECORDINGS MANAGEMENT (HEMAT MEMORI) ---
class StreamingRecordingViewSet(viewsets.ModelViewSet):
    queryset = StreamingRecording.objects.all().order_by('-created_at')
    serializer_class = StreamingRecordingSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def sync_recordings(self, request):
        """
        Scan /backend/media/recordings directory for new physical recordings
        that are not yet indexed in the database.
        """
        recordings_dir = os.path.join(settings.MEDIA_ROOT, 'recordings')
        
        # Create directory if it does not exist
        if not os.path.exists(recordings_dir):
            os.makedirs(recordings_dir, exist_ok=True)
            return Response({"message": "Folder rekaman kosong dan berhasil dibuat.", "synced_count": 0})

        files = os.listdir(recordings_dir)
        synced_count = 0
        
        for file in files:
            # Only process flv/mp4 recording files
            if file.endswith('_recorded.flv') or file.endswith('.mp4'):
                filepath = os.path.join(recordings_dir, file)
                
                # Check if already in DB
                if not StreamingRecording.objects.filter(file_name=file).exists():
                    filesize = os.path.getsize(filepath)
                    
                    # Parse timestamp from name if possible, e.g. bae_key_1717312345_recorded.flv
                    title = "Rekaman Live Streaming"
                    try:
                        parts = file.split('_')
                        for p in parts:
                            if p.isdigit() and len(p) >= 9: # Looks like epoch timestamp
                                epoch = int(p)
                                dt = datetime.fromtimestamp(epoch)
                                title = f"Streaming {dt.strftime('%d %b %Y - %H:%M')}"
                                break
                    except:
                        pass
                        
                    StreamingRecording.objects.create(
                        title=title,
                        file_name=file,
                        file_size=filesize
                    )
                    synced_count += 1
                    
        return Response({
            "message": f"Berhasil sinkronisasi file rekaman VPS.",
            "synced_count": synced_count
        })

    def destroy(self, request, *args, **kwargs):
        """
        Delete the DB record AND delete the physical video file on VPS
        to instantly free up disk space.
        """
        instance = self.get_object()
        file_path = os.path.join(settings.MEDIA_ROOT, 'recordings', instance.file_name)
        
        # 1. Delete physical file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                # Log the error but proceed with DB deletion so it doesn't block the UI
                pass
                
        # 2. Delete database record
        self.perform_destroy(instance)
        return Response({"message": "Rekaman berhasil dihapus permanen dari VPS."}, status=status.HTTP_200_OK)


# --- 5. SEO SHARE PREVIEW CRAWLER TRAP VIEW ---
def seo_streaming_detail(request):
    """
    Dynamic index server for /streaming/ share path.
    Injects current live streaming title and preview metadata.
    """
    from barakah_app.seo_utils import get_seo_response
    
    settings_obj, _ = StreamingSettings.objects.get_or_create(id=1)
    
    # Metadata for Open Graph preview (WhatsApp, FB, etc.)
    title = settings_obj.title if settings_obj.is_live else "Live Streaming Barakah Economy"
    description = settings_obj.description if settings_obj.is_live else "Tonton dan ikuti siaran langsung kajian serta program Barakah Economy."
    
    # Custom uploaded thumbnail for dynamic share preview (WhatsApp, FB, etc.)
    site_url = request.build_absolute_uri('/')[:-1]
    if settings_obj.thumbnail:
        image_url = f"{site_url}{settings_obj.thumbnail.url}"
    else:
        image_url = f"{site_url}/images/web-thumbnail.jpg" # default static preview
    
    metadata = {
        'title': title,
        'description': description,
        'image_url': image_url,
        'type': 'video.other',
        'body_content': f"<h1>{title}</h1><p>{description}</p><p>Masuk untuk berkomentar dan memberikan dukungan.</p>"
    }
    
    return get_seo_response(request, metadata)


# --- 6. LIVE VIEWERS COUNTER ---
class StreamingViewersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        GET /api/streaming/viewers/ returns the total number of active viewers.
        """
        stream_key = request.query_params.get('stream_key', 'barakah_stream_key')
        # Cleanup viewers inactive for more than 20 seconds
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(stream_key=stream_key, last_seen__lt=cutoff).delete()
        
        total_viewers = StreamingViewer.objects.filter(stream_key=stream_key).count()
        return Response({"total_viewers": total_viewers})

    def post(self, request):
        """
        POST /api/streaming/viewers/ registers/updates a viewer's heartbeat.
        Expects {"session_key": "some-unique-browser-uuid", "stream_key": "xxx"}
        """
        session_key = request.data.get('session_key')
        stream_key = request.data.get('stream_key', 'barakah_stream_key')
        if not session_key:
            return Response({"detail": "session_key wajib disertakan."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update or create the active viewer session
        StreamingViewer.objects.update_or_create(
            session_key=session_key,
            stream_key=stream_key,
            defaults={'last_seen': timezone.now()}
        )
        
        # Cleanup viewers inactive for more than 20 seconds
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(stream_key=stream_key, last_seen__lt=cutoff).delete()
        
        total_viewers = StreamingViewer.objects.filter(stream_key=stream_key).count()
        return Response({"total_viewers": total_viewers})


# --- 7. HP BROWSER WHIP STATUS & CONTROL ---
class StreamingWhipStatusView(APIView):
    """
    Manages the HP/browser WebRTC live stream status.
    Uses MediaMTX internal API to verify if stream is truly active.
    """
    permission_classes = [IsAdminUser]

    MEDIAMTX_API = "http://mediamtx:9997/v3"

    def _check_mediamtx_stream(self, stream_key):
        """Check if a stream is actively publishing to MediaMTX."""
        try:
            resp = http_requests.get(
                f"{self.MEDIAMTX_API}/paths/get/{stream_key}",
                timeout=3
            )
            if resp.status_code == 200:
                data = resp.json()
                # MediaMTX returns source info when something is publishing
                return data.get('source') is not None
            return False
        except Exception:
            # If MediaMTX is unreachable (e.g. local dev), trust the DB flag
            return None

    def get(self, request):
        """
        GET /api/streaming/whip-status/
        Returns current HP stream status + MediaMTX connectivity check.
        """
        event_id = request.query_params.get('event_id')
        settings_view = StreamingSettingsView()
        settings_obj = settings_view.get_object(event_id)
        
        # Cross-check with MediaMTX if possible
        mtx_active = self._check_mediamtx_stream(settings_obj.stream_key)
        
        # If MediaMTX says stream stopped but DB says active, auto-correct
        if mtx_active is False and settings_obj.is_hp_streaming_active:
            settings_obj.is_hp_streaming_active = False
            settings_obj.whip_hls_url = ""
            settings_obj.save(update_fields=['is_hp_streaming_active', 'whip_hls_url'])
            
        whip_url, mediamtx_hls_url = get_whip_urls(request, settings_obj)
        
        return Response({
            "is_hp_streaming_active": settings_obj.is_hp_streaming_active,
            "whip_hls_url": settings_obj.whip_hls_url,
            "stream_key": settings_obj.stream_key,
            "whip_url": whip_url,
            "mediamtx_hls_url": mediamtx_hls_url,
            "mediamtx_reachable": mtx_active is not None,
            "orientation": settings_obj.orientation,
        })

    def post(self, request):
        """
        POST /api/streaming/whip-status/
        Called by frontend to register that HP stream started or stopped.
        Body: {"action": "start", "orientation": "landscape"/"portrait", "event_id": "..."} or {"action": "stop", "event_id": "..."}
        """
        action_type = request.data.get('action')
        event_id = request.data.get('event_id')
        settings_view = StreamingSettingsView()
        settings_obj = settings_view.get_object(event_id)
        
        if action_type == 'start':
            orientation = request.data.get('orientation', 'landscape')
            if orientation not in ['landscape', 'portrait']:
                orientation = 'landscape'
                
            whip_url, whip_hls_url = get_whip_urls(request, settings_obj)
            
            settings_obj.is_hp_streaming_active = True
            settings_obj.whip_hls_url = whip_hls_url
            settings_obj.orientation = orientation
            # Auto-set is_live to True when HP stream starts
            if not settings_obj.is_live:
                settings_obj.is_live = True
                StreamingChat.objects.filter(stream_key=settings_obj.stream_key).delete()
                StreamingLike.objects.filter(stream_key=settings_obj.stream_key).delete()
                
                # Send notifications to users registered for this event
                if settings_obj.event:
                    user_ids = EventRegistration.objects.filter(
                        event=settings_obj.event,
                        status='approved',
                        user__isnull=False
                    ).values_list('user_id', flat=True).distinct()
                    
                    notifications = [
                        EventStreamNotification(
                            recipient_id=user_id,
                            event=settings_obj.event,
                            stream_settings=settings_obj
                        )
                        for user_id in user_ids
                    ]
                    EventStreamNotification.objects.bulk_create(notifications)
            settings_obj.save()
            return Response({
                "status": "started",
                "message": "Live via HP dimulai. Penonton dapat mulai bergabung.",
                "whip_url": whip_url,
                "hls_url": settings_obj.whip_hls_url,
                "orientation": settings_obj.orientation,
            })
        
        elif action_type == 'stop':
            settings_obj.is_hp_streaming_active = False
            settings_obj.whip_hls_url = ""
            settings_obj.save(update_fields=['is_hp_streaming_active', 'whip_hls_url'])
            return Response({
                "status": "stopped",
                "message": "Live via HP dihentikan.",
            })
        
        return Response(
            {"detail": "action harus 'start' or 'stop'."},
            status=status.HTTP_400_BAD_REQUEST
        )


# --- 8. AUTH SESSION EXTENDER (anti-logout saat live) ---
class StreamingExtendSessionView(APIView):
    """
    POST /api/streaming/extend-session/
    Called every ~4 minutes while admin is live streaming.
    Refreshes the JWT access token so the admin session never expires during live.
    Body: {"refresh": "<refresh_token>"}
    Returns: {"access": "<new_access_token>"}
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        refresh_token_str = request.data.get('refresh')
        if not refresh_token_str:
            return Response(
                {"detail": "refresh token wajib disertakan."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh = RefreshToken(refresh_token_str)
            new_access = str(refresh.access_token)
            return Response({
                "access": new_access,
                "message": "Sesi diperpanjang. Siaran aman berlanjut.",
            })
        except Exception as e:
            return Response(
                {"detail": f"Token tidak valid atau sudah kedaluwarsa: {str(e)}"},
                status=status.HTTP_401_UNAUTHORIZED
            )


# --- 9. EVENT STREAM NOTIFICATION VIEW ---
class EventStreamNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        GET /api/streaming/notifications/
        Returns unread live stream notifications for the current user.
        """
        notifications = EventStreamNotification.objects.filter(recipient=request.user, is_read=False)
        data = [{
            'id': n.id,
            'event_title': n.event.title,
            'event_slug': n.event.slug,
            'stream_title': n.stream_settings.title,
            'created_at': n.created_at
        } for n in notifications]
        return Response(data)

    def post(self, request, pk=None):
        """
        POST /api/streaming/notifications/<pk>/mark-read/
        Marks a specific notification as read.
        """
        notif = get_object_or_404(EventStreamNotification, id=pk, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'status': 'success'})
