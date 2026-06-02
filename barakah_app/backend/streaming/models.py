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

    class Meta:
        verbose_name = "Streaming Settings"
        verbose_name_plural = "Streaming Settings"

    def __str__(self):
        return f"Streaming: {'LIVE' if self.is_live else 'OFFLINE'} - {self.title}"

class StreamingRecording(models.Model):
    title = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)  # in bytes
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class StreamingChat(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaming_chats')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.message[:30]}"

class StreamingLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaming_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_like')
        ]

    def __str__(self):
        return f"Like by {self.user.username}"

class StreamingViewer(models.Model):
    session_key = models.CharField(max_length=100, unique=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Viewer {self.session_key} - {self.last_seen}"
