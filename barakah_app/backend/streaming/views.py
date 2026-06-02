import os
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import StreamingSettings, StreamingRecording, StreamingChat, StreamingLike
from .serializers import (
    StreamingSettingsSerializer, 
    StreamingRecordingSerializer, 
    StreamingChatSerializer
)

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

# --- 1. SETTINGS VIEW ---
class StreamingSettingsView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        obj, created = StreamingSettings.objects.get_or_create(id=1)
        if created or not obj.stream_key or obj.stream_key == "barakah_stream_key":
            # Generate a secure unique stream key on first creation
            obj.stream_key = f"bae_{uuid.uuid4().hex[:12]}"
            obj.save()
        return obj

    def get(self, request):
        settings_obj = self.get_object()
        user = request.user
        
        # Check if the HLS playlist file exists on VPS to detect if OBS is active
        hls_file_path = os.path.join(settings.MEDIA_ROOT, 'live', f"{settings_obj.stream_key}.m3u8")
        is_obs_active = os.path.exists(hls_file_path)
        
        # Cleanup inactive viewers and count total active sessions
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(last_seen__lt=cutoff).delete()
        viewer_count = StreamingViewer.objects.count()
        
        # Admin gets stream_key, normal users do NOT (for streaming security)
        # Note: public needs to know the stream_key to fetch the HLS playlist,
        # but we only share the HLS URL when is_live is True.
        # So we include it if they are admin or if stream is live.
        is_admin = user and user.is_authenticated and user.role == 'admin'
        
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
        }
        
        if is_admin or settings_obj.is_live:
            data['stream_key'] = settings_obj.stream_key
            data['hls_url'] = f"/media/live/{settings_obj.stream_key}.m3u8"
        
        if is_admin:
            data['rtmp_url'] = "rtmp://barakah.cloud:1935/live"
            
        return Response(data)

    def patch(self, request):
        # Only admin can modify settings
        if not request.user or not request.user.is_authenticated or request.user.role != 'admin':
            return Response({"detail": "Hanya admin yang dapat mengubah pengaturan streaming."}, status=status.HTTP_403_FORBIDDEN)
            
        settings_obj = self.get_object()
        
        # Reset chat and likes when a new stream starts (toggled from offline/False to live/True)
        is_live_before = settings_obj.is_live
        is_live_now = request.data.get('is_live', is_live_before)
        if not is_live_before and is_live_now:
            StreamingChat.objects.all().delete()
            StreamingLike.objects.all().delete()
            
        # Clean up or sync recording when stream ends (toggled from live/True to offline/False)
        if is_live_before and not is_live_now:
            should_save = request.data.get('save_recording', settings_obj.save_recording)
            recordings_dir = os.path.join(settings.MEDIA_ROOT, 'recordings')
            if os.path.exists(recordings_dir):
                files = os.listdir(recordings_dir)
                for file in files:
                    if file.endswith('_recorded.flv') or file.endswith('.mp4'):
                        if not StreamingRecording.objects.filter(file_name=file).exists():
                            if not should_save:
                                # DISCARD: physically delete the unsynced recording file to save disk space
                                try:
                                    os.remove(os.path.join(recordings_dir, file))
                                except:
                                    pass
                            else:
                                # SAVE: automatically register the unsynced recording in the database
                                title = "Rekaman Live Streaming"
                                try:
                                    parts = file.split('_')
                                    for p in parts:
                                        if p.isdigit() and len(p) >= 9:
                                            epoch = int(p)
                                            dt = datetime.fromtimestamp(epoch)
                                            title = f"Streaming {dt.strftime('%d %b %Y - %H:%M')}"
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
            
        settings_obj = self.get_object()
        settings_obj.stream_key = f"bae_{uuid.uuid4().hex[:12]}"
        settings_obj.save()
        return Response({
            "message": "Stream Key berhasil diregenerasi.",
            "stream_key": settings_obj.stream_key,
            "hls_url": f"/media/live/{settings_obj.stream_key}.m3u8"
        })



# --- 2. CHAT / COMMENTS VIEW ---
class StreamingChatViewSet(viewsets.ModelViewSet):
    queryset = StreamingChat.objects.all().select_related('user', 'user__profile')
    serializer_class = StreamingChatSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# --- 3. LIKES VIEW ---
class StreamingLikeView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        total_likes = StreamingLike.objects.count()
        user_has_liked = False
        if request.user and request.user.is_authenticated:
            user_has_liked = StreamingLike.objects.filter(user=request.user).exists()
            
        return Response({
            "total_likes": total_likes,
            "has_liked": user_has_liked
        })

    def post(self, request):
        user = request.user
        like_filter = StreamingLike.objects.filter(user=user)
        
        if like_filter.exists():
            like_filter.delete()
            liked = False
        else:
            StreamingLike.objects.create(user=user)
            liked = True
            
        total_likes = StreamingLike.objects.count()
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

from .models import StreamingViewer

# --- 6. LIVE VIEWERS COUNTER ---
class StreamingViewersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """
        GET /api/streaming/viewers/ returns the total number of active viewers.
        """
        # Cleanup viewers inactive for more than 20 seconds
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(last_seen__lt=cutoff).delete()
        
        total_viewers = StreamingViewer.objects.count()
        return Response({"total_viewers": total_viewers})

    def post(self, request):
        """
        POST /api/streaming/viewers/ registers/updates a viewer's heartbeat.
        Expects {"session_key": "some-unique-browser-uuid"}
        """
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({"detail": "session_key wajib disertakan."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Update or create the active viewer session
        StreamingViewer.objects.update_or_create(
            session_key=session_key,
            defaults={'last_seen': timezone.now()}
        )
        
        # Cleanup viewers inactive for more than 20 seconds
        cutoff = timezone.now() - timedelta(seconds=20)
        StreamingViewer.objects.filter(last_seen__lt=cutoff).delete()
        
        total_viewers = StreamingViewer.objects.count()
        return Response({"total_viewers": total_viewers})
