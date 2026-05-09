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
    is_automatic = models.BooleanField(default=True, 
        help_text="If True, this role can be obtained automatically via profile completion.")
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
    event_attendance_json = models.JSONField(default=list, blank=True, help_text="Cached list of attended events")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def has_menu_access(self, menu_key):
        """Check if user has access to a specific menu via custom_roles."""
        if not self.is_authenticated:
            return False
        if self.role == 'admin' or self.is_staff:
            return True
        
        # Defensive check for ManyToMany manager
        try:
            roles_manager = getattr(self, 'custom_roles', None)
            if roles_manager is None:
                return False
                
            active_roles = roles_manager.filter(is_active=True)
            for role in active_roles:
                if role.accessible_menus and menu_key in role.accessible_menus:
                    return True
        except Exception:
            pass
        return False

    def get_all_accessible_menus(self):
        """Get all menu keys accessible by this user."""
        if not self.is_authenticated:
            return []
        if self.role == 'admin' or self.is_staff:
            return ['*']
            
        menus = set()
        try:
            roles_manager = getattr(self, 'custom_roles', None)
            if roles_manager:
                for r in roles_manager.filter(is_active=True):
                    menus.update(r.accessible_menus or [])
        except Exception:
            pass
        return list(menus)

    @property
    def is_profile_complete(self):
        """Checks if user has filled mandatory fields: phone, full name, info source, and referral."""
        profile = getattr(self, 'profile', None)
        return bool(
            self.phone and 
            profile and 
            profile.name_full and 
            profile.info_source and 
            profile.referred_by
        )
