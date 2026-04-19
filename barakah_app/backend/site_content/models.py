from django.db import models
from ckeditor.fields import RichTextField
from accounts.models import User

class Partner(models.Model):
    TYPE_CHOICES = [
        ('partner', 'Partner'),
        ('mitra', 'Mitra'),
    ]
    name = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='partners/')
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='partner')
    order = models.PositiveIntegerField(default=0)
    link = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.name

class AboutUs(models.Model):
    title = models.CharField(max_length=255, default='Tentang Kami')
    hero_image = models.ImageField(upload_to='site/', blank=True, null=True)
    organization_structure_image = models.ImageField(upload_to='site/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    vision = models.TextField(blank=True, null=True)
    mission = models.TextField(blank=True, null=True)
    legal_description = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "About Us"

    def __str__(self):
        return self.title

class AboutUsLegalDocument(models.Model):
    about_us = models.ForeignKey(AboutUs, on_delete=models.CASCADE, related_name='legal_documents')
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='site/legal/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.about_us.title}"

class Testimonial(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='testimonials')
    name = models.CharField(max_length=100, blank=True, help_text="Name for admin-added testimonials if no user")
    content = models.TextField()
    rating = models.PositiveIntegerField(default=5)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Testimonial by {self.user.username if self.user else self.name}"

class Activity(models.Model):
    title = models.CharField(max_length=255)
    header_image = models.ImageField(upload_to='activities/', null=True, blank=True)
    content = RichTextField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Link to event for automatic documentation
    event = models.OneToOneField(
        'events.Event', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='activity_documentation',
        help_text="The event this documentation refers to"
    )

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return self.title
