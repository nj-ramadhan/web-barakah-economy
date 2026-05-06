# accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser


class Role(models.Model):
    """Dynamic role with configurable menu access and profile requirements."""
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True)
    accessible_menus = models.JSONField(default=list, blank=True,
        help_text="List of menu keys this role can access")
    required_profile_fields = models.JSONField(default=list, blank=True,
        help_text="Profile fields required for verified member with this role")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class UserLabel(models.Model):
    """Labels for categorizing users. Code is obfuscated for non-admin."""
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    color = models.CharField(max_length=20, default='gray')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class LingkupTugas(models.Model):
    """Lingkup Tugas untuk user (contoh: Pusat, Wilayah, dll)."""
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    color = models.CharField(max_length=20, default='blue')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class BidangTugas(models.Model):
    """Bidang Tugas untuk user (contoh: Manajemen Umum, SDM, dll)."""
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    color = models.CharField(max_length=20, default='emerald')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    ROLE_CHOICES = (
        ('user', 'User / Peminat'),
        ('seller', 'Seller / Penjual'),
        ('admin', 'Admin Barakah'),
        ('staff', 'Staff / Pengelola'),
    )

    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    is_verified_member = models.BooleanField(default=False)

    # Dynamic role & label system
    custom_roles = models.ManyToManyField(Role, blank=True, related_name='users')
    labels = models.ManyToManyField(UserLabel, blank=True, related_name='users')
    lingkup_tugas = models.ManyToManyField(LingkupTugas, blank=True, related_name='users')
    bidang_tugas = models.ManyToManyField(BidangTugas, blank=True, related_name='users')
    position = models.CharField(max_length=100, blank=True, null=True, help_text="Jabatan di BAE")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def has_menu_access(self, menu_key):
        """Check if user has access to a specific menu via custom_roles."""
        if self.role == 'admin':
            return True
        return self.custom_roles.filter(
            accessible_menus__contains=[menu_key],
            is_active=True
        ).exists()

    def get_all_accessible_menus(self):
        """Get all menu keys accessible by this user."""
        if self.role == 'admin':
            return ['*']  # Admin has access to all
        menus = set()
        for r in self.custom_roles.filter(is_active=True):
            menus.update(r.accessible_menus or [])
        return list(menus)
