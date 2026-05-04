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
    header_image_full = models.ImageField(upload_to='events/headers/full/', blank=True, null=True)
    thumbnail = models.ImageField(upload_to='events/thumbnails/', blank=True, null=True)
    thumbnail_full = models.ImageField(upload_to='events/thumbnails/full/', blank=True, null=True)
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    location = models.CharField(max_length=255)
    location_url = models.URLField(blank=True, null=True)
    
    organizer_name = models.CharField(max_length=100)
    organizer_contact = models.CharField(max_length=50, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_featured = models.BooleanField(default=False)

    # Documentation
    documentation_link = models.URLField(blank=True, null=True)
    documentation_frame_1_1 = models.ImageField(upload_to='events/frames/', blank=True, null=True, help_text="Bingkai 1:1 format transparan (PNG) untuk otomatis overlay dokumentasi.")

    # Details
    capacity = models.IntegerField(blank=True, null=True, default=0, help_text="Kapasitas terbatas jika > 0, tak terbatas jika 0.")
    terms_do = models.TextField(blank=True, null=True, help_text="Baris baru memisahkan tiap point Do")
    terms_dont = models.TextField(blank=True, null=True, help_text="Baris baru memisahkan tiap point Dont")

    # HTM / Payment Settings
    PRICE_TYPE_CHOICES = [
        ('free', 'Gratis'),
        ('fixed', 'Berbayar (Fix)'),
        ('voluntary', 'Sukarela (Seikhlasnya)'),
        ('hybrid_1', 'Hybrid 1 (Min Fix + Topup)'),
        ('hybrid_2', 'Hybrid 2 (Pilihan Fix/Sukarela)'),
    ]
    price_type = models.CharField(max_length=20, choices=PRICE_TYPE_CHOICES, default='free')
    price_fixed = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    rejection_reason = models.TextField(blank=True, null=True)
    view_count = models.PositiveIntegerField(default=0)
    
    # New Fields for Attachments & Visibility
    attachment_file = models.FileField(upload_to='events/attachments/', blank=True, null=True, help_text="Lampiran berkas pendukung (PDF/Gambar/Dokumen)")
    attachment_file_title = models.CharField(max_length=100, blank=True, null=True, help_text="Judul untuk berkas (misal: Daftar Menu)")
    attachment_link = models.URLField(blank=True, null=True, help_text="Link tautan eksternal pendukung")
    attachment_link_title = models.CharField(max_length=100, blank=True, null=True, help_text="Judul untuk link (misal: Lokasi Gmaps)")
    VISIBILITY_CHOICES = [
        ('public', 'Umum (Tampil di Beranda)'),
        ('private', 'Privat (Hanya lewat link langsung)'),
    ]
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='public')
    visible_at = models.DateTimeField(blank=True, null=True, help_text="Waktu event mulai ditampilkan di publik (kosongkan jika langsung tampil)")
    registration_start_at = models.DateTimeField(blank=True, null=True, help_text="Waktu pendaftaran mulai dibuka (kosongkan jika langsung dibuka)")
    
    # Information fields
    category = models.CharField(max_length=100, blank=True, null=True, help_text="Kategori event (misal: Pelatihan, Seminar, dll)")
    has_certificate = models.BooleanField(default=False, help_text="Apakah event ini menyediakan sertifikat?")
    allow_ots_payment = models.BooleanField(default=False, help_text="Izinkan pembayaran di tempat (On The Spot)")

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
        
        # If header_image is empty but thumbnail is present, use thumbnail
        if not self.header_image and self.thumbnail:
            self.header_image = self.thumbnail
            
        super().save(*args, **kwargs)

class EventDocumentationImage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='documentation_images')
    image = models.ImageField(upload_to='events/documentation/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Documentation for {self.event.title}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and self.event.documentation_frame_1_1 and self.image:
            try:
                from PIL import Image
                import os
                
                doc_path = self.image.path
                frame_path = self.event.documentation_frame_1_1.path
                
                if os.path.exists(doc_path) and os.path.exists(frame_path):
                    doc_img = Image.open(doc_path).convert("RGBA")
                    frame_img = Image.open(frame_path).convert("RGBA")
                    
                    # Crop to 4:5 (Width:Height)
                    width, height = doc_img.size
                    target_ratio = 4 / 5
                    current_ratio = width / height
                    
                    if current_ratio > target_ratio:
                        # Image is wider than 4:5, crop horizontal
                        new_height = height
                        new_width = int(new_height * target_ratio)
                    else:
                        # Image is taller than 4:5, crop vertical
                        new_width = width
                        new_height = int(new_width / target_ratio)
                    
                    left = (width - new_width) / 2
                    top = (height - new_height) / 2
                    right = (width + new_width) / 2
                    bottom = (height + new_height) / 2
                    
                    doc_img = doc_img.crop((left, top, right, bottom))
                    
                    # Resize doc to match exactly frame dimensions
                    f_width, f_height = frame_img.size
                    
                    doc_img = doc_img.resize((f_width, f_height), Image.Resampling.LANCZOS)
                    
                    combined = Image.alpha_composite(doc_img, frame_img)
                    final_img = combined.convert("RGB")
                    
                    final_img.save(doc_path, format="JPEG", quality=90)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error processing doc frame overlay: {str(e)}")

class EventGalleryImage(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='gallery_images')
    image = models.ImageField(upload_to='events/gallery/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery for {self.event.title}"

class EventSpeaker(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='speakers')
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, help_text="Misal: Pemateri Ahli")
    photo = models.ImageField(upload_to='events/speakers/', blank=True, null=True)
    link = models.URLField(blank=True, null=True, help_text="Link profil atau website narasumber")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} - {self.event.title}"

class EventSession(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255, help_text="Misal: Sesi 1 - Pembukaan")
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'start_time']

    def __str__(self):
        return f"{self.title} - {self.event.title}"

class EventAttendance(models.Model):
    registration = models.ForeignKey('EventRegistration', on_delete=models.CASCADE, related_name='attendances')
    session = models.ForeignKey(EventSession, on_delete=models.CASCADE, related_name='attendances', null=True, blank=True)
    attended_at = models.DateTimeField(auto_now_add=True)
    scanned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('registration', 'session')

    def __str__(self):
        return f"Attendance {self.registration.id} Sesi: {self.session.title if self.session else 'Umum'}"

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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    
    # Payment info
    payment_method = models.CharField(max_length=20, choices=[('transfer', 'Transfer'), ('ots', 'On The Spot')], default='transfer')
    payment_proof = models.ImageField(upload_to='events/payments/', blank=True, null=True)
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('verified', 'Verified'), ('rejected', 'Rejected')], default='pending')
    ocr_data = models.JSONField(blank=True, null=True, help_text="Data hasil ekstraksi OCR AI")
    ocr_verified = models.BooleanField(default=False)
    
    # QR Code & Attendance
    unique_code = models.CharField(max_length=20, unique=True, blank=True, null=True, help_text="Kode unik untuk QR Code kehadiran")
    qr_image = models.ImageField(upload_to='events/qr_codes/', blank=True, null=True, help_text="QR Code yang di-generate server")
    is_attended = models.BooleanField(default=False, help_text="Tandai hadir saat event berlangsung")
    attended_at = models.DateTimeField(blank=True, null=True, help_text="Waktu scan kehadiran")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event.title} - {self.guest_name or (self.user.username if self.user else 'Guest')}"

    def save(self, *args, **kwargs):
        # Auto-generate kode unik 8 karakter saat pertama dibuat
        if not self.unique_code:
            import uuid
            self.unique_code = uuid.uuid4().hex[:8].upper()
            # Pastikan tidak ada duplikat
            while EventRegistration.objects.filter(unique_code=self.unique_code).exclude(pk=self.pk).exists():
                self.unique_code = uuid.uuid4().hex[:8].upper()
                
        # Auto-generate QR code image
        if not self.qr_image and self.unique_code:
            try:
                import qrcode
                from io import BytesIO
                from django.core.files.base import ContentFile
                
                qr = qrcode.QRCode(version=1, box_size=10, border=4)
                qr.add_data(self.unique_code)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                self.qr_image.save(f"qr_{self.unique_code}.png", ContentFile(buffer.getvalue()), save=False)
            except ImportError:
                print("Library qrcode belum terinstall. Lewati generate gambar QR.")
                
        super().save(*args, **kwargs)

class EventRegistrationFile(models.Model):
    registration = models.ForeignKey(EventRegistration, on_delete=models.CASCADE, related_name='uploaded_files')
    field = models.ForeignKey(EventFormField, on_delete=models.CASCADE)
    file = models.FileField(upload_to='events/registrations/')

    def __str__(self):
        return f"File for {self.field.label} - {self.registration.id}"

class EventCertificate(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='certificate')
    template_image = models.ImageField(upload_to='events/certificates/templates/')
    
    # Position in percentage (0-100) for better responsiveness
    name_x = models.FloatField(default=50.0)
    name_y = models.FloatField(default=50.0)
    
    font_size = models.IntegerField(default=40)
    font_color = models.CharField(max_length=7, default='#000000') # HEX color
    font_family = models.CharField(max_length=100, default='Roboto-Bold.ttf')
    font_bold = models.BooleanField(default=True)
    font_italic = models.BooleanField(default=False)
    text_align = models.CharField(max_length=10, default='center') # left, center, right
    vertical_align = models.CharField(max_length=10, default='middle') # top, middle, bottom
    
    # Bounding box for name (as percentage of image size)
    name_width = models.FloatField(default=80.0)
    name_height = models.FloatField(default=10.0)
    text_align = models.CharField(max_length=20, default='center') # left, center, right

    show_unique_code = models.BooleanField(default=False)
    code_x = models.FloatField(default=10.0)
    code_y = models.FloatField(default=90.0)
    code_font_size = models.IntegerField(default=20)
    code_font_family = models.CharField(max_length=100, default='Roboto-Bold.ttf')
    code_font_color = models.CharField(max_length=20, default='#000000')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Certificate for {self.event.title}"
