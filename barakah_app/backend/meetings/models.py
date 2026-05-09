from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid

User = settings.AUTH_USER_MODEL

class Meeting(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True)
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    
    location = models.CharField(max_length=255)
    location_url = models.URLField(blank=True, null=True)
    
    thumbnail = models.ImageField(upload_to='meetings/thumbnails/', blank=True, null=True)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_meetings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            while Meeting.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{uuid.uuid4().hex[:4]}"
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class MeetingSession(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    is_finished = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'start_time']

    def __str__(self):
        return f"{self.title} - {self.meeting.title}"

class MeetingParticipant(models.Model):
    ATTENDANCE_STATUS = [
        ('present', 'Hadir'),
        ('absent', 'Tidak Hadir'),
        ('pending', 'Belum Diabsen'),
    ]

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meeting_participations')
    
    status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS, default='pending')
    remarks = models.TextField(blank=True, null=True)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    marked_at = models.DateTimeField(blank=True, null=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='marked_attendances')

    class Meta:
        unique_together = ('meeting', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.meeting.title}"
class SessionAttendance(models.Model):
    ATTENDANCE_STATUS = [
        ('present', 'Hadir'),
        ('absent', 'Tidak Hadir'),
        ('pending', 'Belum Diabsen'),
    ]

    participant = models.ForeignKey(MeetingParticipant, on_delete=models.CASCADE, related_name='session_attendances')
    session = models.ForeignKey(MeetingSession, on_delete=models.CASCADE, related_name='attendances')
    
    status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS, default='pending')
    remarks = models.TextField(blank=True, null=True)
    
    marked_at = models.DateTimeField(auto_now=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='session_marks')

    class Meta:
        unique_together = ('participant', 'session')

    def __str__(self):
        return f"{self.participant.user.username} - {self.session.title}"
