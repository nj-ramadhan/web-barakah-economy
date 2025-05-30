from django.db import models
from accounts.models import User
from ckeditor.fields import RichTextField
from django.utils.text import slugify
import uuid
import os

def generate_unique_slug(model, name):
    slug = slugify(name)
    unique_slug = slug
    num = 1
    while model.objects.filter(slug=unique_slug).exists():
        unique_slug = f'{slug}-{num}'
        num += 1
    return unique_slug

def proof_file_path(instance, filename):
    """Generate a unique path for uploaded proof files"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('course_payment_proofs', filename)

class Course(models.Model):
    CATEGORY_CHOICES = [
        ('islam', 'Agama Islam'),
        ('it', 'Programming & Development'),
        ('teknik', 'Engineering'),
        ('bisnis', 'Business & Entrepreneurship'),
        ('kreatif', 'Design & Creativity'),
        ('personal', 'Personal Development'),
        ('kesehatan', 'Health & Lifestyle'),
        ('akademik', 'Academics & Test Prep'),
    ]

    title = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField()
    instructor = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='course_images/')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    duration = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"

class CourseEnrollment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='user')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    proof_file = models.FileField(upload_to=proof_file_path, null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')  # 'pending', 'paid'

    class Meta:
        unique_together = ('user', 'course')

class CourseMaterial(models.Model):
    MATERIAL_TYPE_CHOICES = [
        ('article', 'Article'),
        ('video', 'Video'),
        ('quiz', 'Quiz'),
    ]
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=255)
    content = RichTextField()  # For articles or video embed code
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE_CHOICES)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.title} ({self.material_type})"