from django.db import models
from django.utils.text import slugify
from accounts.models import User
import uuid

class Thread(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_threads')
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Thread.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

class Reply(models.Model):
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_replies')
    content = models.TextField()
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_expert(self):
        return hasattr(self.author, 'consultant_profile')

    def __str__(self):
        return f"Reply by {self.author.username} on {self.thread.title}"

    class Meta:
        ordering = ['created_at']


class MentionNotification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mention_notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_mentions')
    thread_slug = models.CharField(max_length=255) # To easily build URL
    thread_title = models.CharField(max_length=255) # Quick context
    snippet = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.username} mentioned {self.recipient.username} in {self.thread_slug}"
