from django.db import models
from django.conf import settings

class StreamingSettings(models.Model):
    is_live = models.BooleanField(default=False)
    title = models.CharField(max_length=255, default="Live Streaming Barakah Economy")
    description = models.TextField(blank=True, default="")
    stream_key = models.CharField(max_length=100, unique=True, default="barakah_stream_key")
    latency_mode = models.CharField(max_length=20, default="low", choices=[('low', 'Low Latency'), ('standard', 'Standard Latency')])
    save_recording = models.BooleanField(default=True)
    thumbnail = models.ImageField(upload_to='live_thumbnails/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    # HP/Browser live streaming (WebRTC WHIP via MediaMTX)
    is_hp_streaming_active = models.BooleanField(default=False)
    whip_hls_url = models.CharField(max_length=500, blank=True, default="")
    orientation = models.CharField(max_length=15, default="landscape", choices=[("landscape", "Landscape"), ("portrait", "Portrait")])
    
    # Event integration fields
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, null=True, blank=True, related_name='streams')
    require_registration = models.BooleanField(default=False)

    @property
    def hls_url(self):
        if self.is_hp_streaming_active:
            return self.whip_hls_url
        return f"/media/live/{self.stream_key}.m3u8"

    class Meta:
        verbose_name = "Streaming Settings"
        verbose_name_plural = "Streaming Settings"

    def __str__(self):
        return f"Streaming: {'LIVE' if self.is_live else 'OFFLINE'} - {self.title} (Event: {self.event.title if self.event else 'None'})"

class StreamingRecording(models.Model):
    title = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)  # in bytes
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class StreamingChat(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaming_chats')
    stream_key = models.CharField(max_length=100, default="barakah_stream_key")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} [{self.stream_key}]: {self.message[:30]}"

class StreamingLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaming_likes')
    stream_key = models.CharField(max_length=100, default="barakah_stream_key")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'stream_key'], name='unique_user_stream_like')
        ]

    def __str__(self):
        return f"Like by {self.user.username} on {self.stream_key}"

class StreamingViewer(models.Model):
    session_key = models.CharField(max_length=100)
    stream_key = models.CharField(max_length=100, default="barakah_stream_key")
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['session_key', 'stream_key'], name='unique_session_stream_viewer')
        ]

    def __str__(self):
        return f"Viewer {self.session_key} on {self.stream_key} - {self.last_seen}"

class EventStreamNotification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stream_notifications')
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='stream_notifications')
    stream_settings = models.ForeignKey(StreamingSettings, on_delete=models.CASCADE, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Stream notification for {self.recipient.username} - Event: {self.event.title}"
