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
    slug = models.SlugField(max_length=100, unique=True, blank=True, null=True)
    description = models.TextField()
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='instructed_courses')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='course_images/', blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    duration = models.IntegerField(default=0, help_text="Duration in minutes or hours")
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    has_certificate = models.BooleanField(default=False)
    certificate_info = models.TextField(blank=True, null=True, help_text="Instructions for students regarding the certificate (e.g., 'Sent in 1x24 hours')")
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Course, self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title}"

class CourseEnrollment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='course_enrollments')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments')
    instructor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='course_sales')
    order_number = models.CharField(max_length=30, unique=True, blank=True, null=True)
    buyer_name = models.CharField(max_length=100, blank=True, default='')
    buyer_email = models.EmailField(blank=True, default='')
    buyer_phone = models.CharField(max_length=20, blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    proof_file = models.FileField(upload_to=proof_file_path, null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    def save(self, *args, **kwargs):
        # Generate order number if not exists
        if not self.order_number:
            if not self.id:
                super().save(*args, **kwargs)
            self.order_number = f"CRS-{self.id:06d}"
            # Only update the order_number field to avoid recursion
            kwargs['force_insert'] = False
            super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        try:
            course_title = self.course.title if self.course else "Unknown Course"
            user_info = self.buyer_name or (self.user.username if self.user else "Guest")
            return f"{self.order_number or 'New'} - {course_title} ({user_info})"
        except Exception:
            return f"Enrollment #{self.id}"

    class Meta:
        pass

class CourseMaterial(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    youtube_link = models.URLField(max_length=500, blank=True, null=True)
    pdf_file = models.FileField(upload_to='course_materials/pdf/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.course.title}"

    class Meta:
        ordering = ['order', 'created_at']

class UserCourseProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    material = models.ForeignKey(CourseMaterial, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'material')

class Certificate(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    certificate_number = models.CharField(max_length=50, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='certificates/', blank=True, null=True)

    def __str__(self):
        return f"Certificate for {self.user.username} - {self.course.title}"

class CertificateRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processed', 'Diproses'),
        ('sent', 'Terkirim'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cert_requests')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255, help_text="Name shown on certificate")
    email = models.EmailField()
    whatsapp = models.CharField(max_length=20)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'course')

    def __str__(self):
        return f"Cert Request: {self.full_name} - {self.course.title}"