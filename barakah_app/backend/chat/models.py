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

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Consultant Categories"

class ConsultantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='consultant_profile')
    category = models.ForeignKey(ConsultantCategory, on_delete=models.SET_NULL, null=True, related_name='consultants')
    is_available = models.BooleanField(default=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.category.name if self.category else 'No Category'}"

class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions_as_user')
    consultant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions_as_consultant')
    category = models.ForeignKey(ConsultantCategory, on_delete=models.SET_NULL, null=True)
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
