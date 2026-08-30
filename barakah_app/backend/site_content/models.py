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
    office_address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    whatsapp_number = models.CharField(max_length=50, blank=True, null=True)
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
    view_count = models.PositiveIntegerField(default=0)
    likes = models.ManyToManyField(User, related_name='liked_activities', blank=True)
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

    @property
    def get_image_url(self):
        if self.header_image and self.header_image.name:
            return self.header_image.url
        if self.event:
            event_image = self.event.header_image if (self.event.header_image and self.event.header_image.name) else self.event.thumbnail
            if event_image and event_image.name:
                return event_image.url
        return None

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return self.title


class Announcement(models.Model):
    TYPE_CHOICES = [
        ('promotion', 'Promosi'),
        ('update', 'Update Terbaru'),
        ('announcement', 'Pengumuman'),
        ('info', 'Informasi'),
        ('other', 'Lain-lain'),
    ]

    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='announcement')
    image = models.ImageField(upload_to='announcements/', blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    target_url = models.URLField(blank=True, null=True, help_text="Link to redirect when clicked")
    start_at = models.DateTimeField(null=True, blank=True, help_text="Waktu mulai tampil")
    end_at = models.DateTimeField(null=True, blank=True, help_text="Waktu selesai tampil")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.get_type_display()}] {self.title}"

class HeroBanner(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True, null=True)
    image = models.ImageField(upload_to='hero_banners/', blank=True, null=True)
    video = models.FileField(upload_to='hero_banners/videos/', blank=True, null=True)
    target_url = models.URLField(blank=True, null=True, help_text="Link to redirect when clicked")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title


class CalendarNote(models.Model):
    """Catatan/Draft rencana kegiatan harian pada kalender admin."""
    date = models.DateField(unique=True, db_index=True)
    content = models.TextField()
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='calendar_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='updated_calendar_notes'
    )

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"Catatan {self.date}"


class MaintenanceSetting(models.Model):
    is_active = models.BooleanField(default=False, help_text="Aktifkan mode maintenance (perawatan sistem)")
    title = models.CharField(max_length=255, default="Situs Sedang Dalam Pemeliharaan (Maintenance)")
    message = models.TextField(default="Mohon maaf atas ketidaknyamanannya. Kami sedang melakukan pemeliharaan sistem untuk meningkatkan performa layanan. Silakan kembali beberapa saat lagi.")
    estimated_end = models.DateTimeField(null=True, blank=True, help_text="Perkiraan waktu selesai pemeliharaan (opsional)")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_updates')

    class Meta:
        verbose_name = "Pengaturan Maintenance"
        verbose_name_plural = "Pengaturan Maintenance"

    def __str__(self):
        status_str = "AKTIF" if self.is_active else "NONAKTIF"
        return f"Mode Maintenance ({status_str})"

    @classmethod
    def get_settings(cls):
        settings, _ = cls.objects.get_or_create(id=1)
        return settings


class WhatsNew(models.Model):
    TAG_CHOICES = [
        ('fitur_baru', 'Fitur Baru'),
        ('peningkatan', 'Peningkatan & Optimasi'),
        ('perbaikan', 'Perbaikan Bug'),
        ('pengumuman', 'Pengumuman Penting'),
        ('promo', 'Event & Promo'),
    ]

    CONTENT_TYPE_CHOICES = [
        ('rich_text', 'Deskriptif (Rich Text / HTML)'),
        ('bullet_list', 'Daftar Poin (List)'),
    ]

    title = models.CharField(max_length=255, help_text="Judul update / apa yang baru")
    version = models.CharField(max_length=50, blank=True, null=True, help_text="Versi rilis, misal: v2.4.0 (opsional)")
    tag = models.CharField(max_length=30, choices=TAG_CHOICES, default='fitur_baru')
    badge_label = models.CharField(max_length=50, blank=True, null=True, help_text="Custom badge label (opsional)")
    
    cover_image = models.ImageField(upload_to='whats_new/', blank=True, null=True, help_text="Banner / foto ilustrasi")
    summary = models.TextField(blank=True, null=True, help_text="Ringkasan singkat untuk kartu preview")
    
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='rich_text')
    content_html = RichTextField(blank=True, default='', help_text="Isi konten deskriptif / artikel lengkap")
    bullet_items = models.JSONField(blank=True, default=list, help_text="Daftar poin perubahan (list array string)")
    
    action_button_text = models.CharField(max_length=100, blank=True, null=True, help_text="Teks tombol aksi, misal: 'Coba Sekarang' (opsional)")
    action_button_url = models.CharField(max_length=255, blank=True, null=True, help_text="Link tombol aksi, misal: '/store' (opsional)")
    
    is_published = models.BooleanField(default=True, help_text="Status publikasi")
    is_popup_on_login = models.BooleanField(default=False, help_text="Tampilkan otomatis sebagai popup pengumuman saat user membuka aplikasi")
    release_date = models.DateField(help_text="Tanggal rilis update")
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_whats_new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-release_date', '-created_at']
        verbose_name = "What's New"
        verbose_name_plural = "What's New"

    def __str__(self):
        return f"[{self.version or self.get_tag_display()}] {self.title}"


class WhatsNewFeatureSuggestion(models.Model):
    CATEGORY_CHOICES = [
        ('fitur_baru', 'Fitur Baru'),
        ('peningkatan', 'Peningkatan UI/UX'),
        ('keamanan', 'Keamanan & Autentikasi'),
        ('perbaikan', 'Perbaikan Bug'),
        ('sistem', 'Infrastruktur & Sistem'),
    ]

    title = models.CharField(max_length=255, help_text="Nama/ringkasan fitur atau pembaruan")
    description = models.TextField(blank=True, default='', help_text="Penjelasan detail atau bullet point fitur")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='fitur_baru')
    is_used = models.BooleanField(default=False, help_text="Status apakah sudah pernah digunakan pada What's New")
    used_in_version = models.CharField(max_length=100, blank=True, null=True, help_text="Keterangan rilis What's New yang memakai saran ini")
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_feature_suggestions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['is_used', '-created_at']
        verbose_name = "Saran Fitur What's New"
        verbose_name_plural = "Saran Fitur What's New"

    def __str__(self):
        return f"[{'SUDAH' if self.is_used else 'BELUM'}] {self.title}"



