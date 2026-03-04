# accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User / Peminat'),
        ('seller', 'Seller / Penjual'),
        ('admin', 'Admin Barakah'),
        ('staff', 'Staff / Pengelola'),
    )

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    is_verified_member = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"    
