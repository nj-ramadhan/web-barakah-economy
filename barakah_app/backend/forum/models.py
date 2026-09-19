from django.db import models
from django.utils.text import slugify
from accounts.models import User
import uuid

STATUS_CHOICES = [
    ('pending', 'Menunggu Persetujuan'),
    ('approved', 'Disetujui / Tayang'),
    ('rejected', 'Ditolak'),
    ('spam', 'Terdeteksi Spam (Hidden)'),
]

class Thread(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_threads')
    image = models.ImageField(upload_to='forum/threads/', null=True, blank=True)
    views = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, related_name='liked_threads', blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Thread.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        if self.status == 'approved':
            self.is_approved = True
        elif self.status in ['pending', 'rejected', 'spam']:
            self.is_approved = False
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    is_approved = models.BooleanField(default=True)
    is_spam = models.BooleanField(default=False)
    spam_reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(User, related_name='liked_replies', blank=True)

    @property
    def is_expert(self):
        return hasattr(self.author, 'consultant_profile')

    def save(self, *args, **kwargs):
        if self.status == 'spam' or self.is_spam:
            self.status = 'spam'
            self.is_spam = True
            self.is_approved = False
        elif self.status == 'approved':
            self.is_approved = True
            self.is_spam = False
        elif self.status in ['pending', 'rejected']:
            self.is_approved = False
        super().save(*args, **kwargs)

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
