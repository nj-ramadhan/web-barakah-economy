from django.db import models
from accounts.models import User
import os
import uuid

def chat_attachment_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('chat_attachments', filename)

class ConsultantCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, help_text="Material icon name", default="chat")
    is_active = models.BooleanField(default=True)
    is_ai_enabled = models.BooleanField(default=False)
    welcome_message = models.TextField(blank=True, null=True)
    ai_system_prompt = models.TextField(blank=True, null=True, help_text="Custom personality for this category. Fallback to global if empty.")
    knowledge_base = models.TextField(blank=True, default='', help_text="Materi/Modul untuk grounding AI di kategori ini (Format: Markdown/Text).")
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.name

class ConsultantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='consultant_profile')
    category = models.ForeignKey(ConsultantCategory, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.category.name}"

class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_user')
    consultant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_consultant')
    category = models.ForeignKey(ConsultantCategory, on_delete=models.SET_NULL, null=True)
    is_ai_active = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True, help_text="Sesi aktif atau sudah ditutup")
    last_welcome_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Chat: {self.user.username} with {self.consultant.username} ({self.category.name if self.category else 'N/A'})"

    class Meta:
        ordering = ['-updated_at']

class Message(models.Model):
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to=chat_attachment_path, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"From {self.sender.username} at {self.created_at}"

    class Meta:
        ordering = ['created_at']
class AISettings(models.Model):
    api_key = models.CharField(max_length=255, blank=True)
    base_url = models.URLField(default="https://ai.sumopod.com/v1")
    model_name = models.CharField(max_length=100, default="gpt-4o-mini")
    system_prompt = models.TextField(default="Kamu adalah asisten pintar dari Barakah Economy.")
    is_enabled = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "AI Settings"

    def __str__(self):
        return f"AI Settings ({self.model_name})"

class ChatCommand(models.Model):
    ROLE_CHOICES = [
        ('public', 'Semua Pengguna'),
        ('expert', 'Pakar Saja'),
        ('admin', 'Admin Saja'),
    ]
    code = models.CharField(max_length=50, unique=True, help_text="Contoh: /pakar")
    label = models.CharField(max_length=100)
    content = models.TextField(help_text="Pesan yang akan dikirim saat command diklik")
    icon = models.CharField(max_length=50, default="chat", help_text="Material icon name")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='public')
    is_active = models.BooleanField(default=True)
    
    # Action flags
    is_close_session = models.BooleanField(default=False, help_text="Tutup sesi otomatis")
    is_request_review = models.BooleanField(default=False, help_text="Munculkan modal review otomatis")
    is_toggle_ai_on = models.BooleanField(default=False, help_text="Aktifkan AI otomatis")
    is_toggle_ai_off = models.BooleanField(default=False, help_text="Nonaktifkan AI otomatis")

    def __str__(self):
        return f"{self.code} ({self.get_role_display()})"

class ConsultationReview(models.Model):
    session = models.OneToOneField(ChatSession, on_delete=models.CASCADE, related_name='review')
    rating = models.IntegerField(default=5)
    comment = models.TextField(blank=True, null=True)
    criticism_suggestion = models.TextField(blank=True, null=True, help_text="Kritik & Saran khusus untuk platform/admin")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for Session {self.session.id}"

class GeneralFeedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    content = models.TextField()
    urgent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback from {self.user.username} at {self.created_at}"
