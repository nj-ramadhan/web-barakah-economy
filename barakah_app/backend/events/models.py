from django.db import models
from accounts.models import User
from ckeditor.fields import RichTextField

class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = RichTextField()
    short_description = models.TextField(blank=True, max_length=500)
    
    header_image = models.ImageField(upload_to='events/headers/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='events/thumbnails/', blank=True, null=True)
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    location = models.CharField(max_length=255)
    location_url = models.URLField(blank=True, null=True)
    
    organizer_name = models.CharField(max_length=100)
    organizer_contact = models.CharField(max_length=50, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_featured = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

class EventFormField(models.Model):
    FIELD_TYPES = [
        ('text', 'Short Text'),
        ('textarea', 'Long Text'),
        ('number', 'Number'),
        ('email', 'Email'),
        ('phone', 'Phone Number'),
        ('date', 'Date'),
        ('select', 'Dropdown Selection'),
        ('radio', 'Single Choice (Radio)'),
        ('checkbox', 'Multiple Choice (Checkboxes)'),
        ('file', 'File/Image Upload'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='form_fields')
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=True)
    options = models.JSONField(blank=True, null=True, help_text="JSON array for select/radio/checkbox choices")
    placeholder = models.CharField(max_length=255, blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.event.title} - {self.label}"

class EventRegistration(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='event_registrations')
    
    # Guest info (in case they sign up without account)
    guest_name = models.CharField(max_length=255, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    
    responses = models.JSONField(default=dict, help_text="JSON object mapping field IDs to values")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event.title} - {self.guest_name or (self.user.username if self.user else 'Guest')}"

class EventRegistrationFile(models.Model):
    registration = models.ForeignKey(EventRegistration, on_delete=models.CASCADE, related_name='uploaded_files')
    field = models.ForeignKey(EventFormField, on_delete=models.CASCADE)
    file = models.FileField(upload_to='events/registrations/')

    def __str__(self):
        return f"File for {self.field.label} - {self.registration.id}"
