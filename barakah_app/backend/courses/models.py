from django.db import models

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