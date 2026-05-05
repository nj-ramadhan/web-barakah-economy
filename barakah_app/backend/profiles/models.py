from django.db import models
from accounts.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class Profile(models.Model):
    GENDER_CHOICES = [
        ('l', 'Laki-laki'),
        ('p', 'Perempuan'),
    ]

    MARITAL_CHOICES = [
        ('bn', 'Belum Nikah'),
        ('n', 'Nikah'),
        ('d', 'Duda'),
        ('j', 'Janda'),
    ]

    SEGMENT_CHOICES = [
        ('mahasiswa', 'Mahasiswa'),
        ('pelajar', 'Pelajar'),
        ('santri', 'Santri'),
        ('karyawan', 'Karyawan'),
        ('umum', 'Umum'),
    ]

    STUDY_LEVEL_CHOICES = [
        ('sd', 'Sekolah Dasar atau Setara'),
        ('smp', 'Sekolah Menengah Pertama atau Setara'),
        ('sma', 'Sekolah Menengah Atas / Kejuruan atau Setara'),
        ('s1', 'Sarjana'),
        ('s2', 'Magister'),
        ('s3', 'Doktor'),
    ]

    JOB_CHOICES = [
        ('mahasiswa', 'Mahasiswa'),
        ('asn', 'Aparatur Sipil Negara'),
        ('karyawan_swasta', 'Karyawan Swasta'),
        ('guru', 'Guru'),
        ('dosen', 'Dosen'),
        ('dokter', 'Dokter'),
        ('perawat', 'Perawat'),
        ('apoteker', 'Apoteker'),
        ('programmer', 'Programmer'),
        ('data_scientist', 'Data Scientist'),
        ('desainer_grafis', 'Desainer Grafis'),
        ('marketing', 'Marketing'),
        ('hrd', 'HRD (Human Resources Department)'),
        ('akuntan', 'Akuntan'),
        ('konsultan', 'Konsultan'),
        ('arsitek', 'Arsitek'),
        ('insinyur', 'Insinyur'),
        ('peneliti', 'Peneliti'),
        ('jurnalis', 'Jurnalis'),
        ('penulis', 'Penulis'),
        ('penerjemah', 'Penerjemah'),
        ('pilot', 'Pilot'),
        ('pramugari', 'Pramugari'),
        ('chef', 'Chef'),
        ('pengusaha', 'Pengusaha'),
        ('petani', 'Petani'),
        ('nelayan', 'Nelayan'),
        ('pengrajin', 'Pengrajin'),
        ('teknisi', 'Teknisi'),
        ('seniman', 'Seniman'),
        ('musisi', 'Musisi'),
        ('atlet', 'Atlet'),
        ('polisi', 'Polisi'),
        ('tentara', 'Tentara'),
        ('pengacara', 'Pengacara'),
        ('notaris', 'Notaris'),
        ('psikolog', 'Psikolog'),
        ('sopir', 'Sopir'),
        ('kurir', 'Kurir'),
        ('barista', 'Barista'),
        ('freelancer', 'Freelancer'),
    ]

    WORK_FIELD_CHOICES = [
        ('pendidikan', 'Pendidikan'),
        ('kesehatan', 'Kesehatan'),
        ('ekobis', 'Ekonomi Bisnis'),
        ('agrotek', 'Agrotek'),
        ('herbal', 'Herbal-Farmasi'),
        ('it', 'IT'),
        ('manufaktur', 'Manufaktur'),
        ('energi', 'Energi-Mineral'),
        ('sains', 'Sains'),
        ('teknologi', 'Teknologi'),        
        ('polhuk', 'Politik-Hukum'),
        ('humaniora', 'Humaniora'),
        ('media', 'Media-Literasi'),
        ('sejarah', 'Sejarah'),
    ]

    PROVINCE_CHOICES = [
        ('aceh', 'Aceh'),
        ('sumatera_utara', 'Sumatera Utara'),
        ('sumatera_barat', 'Sumatera Barat'),
        ('riau', 'Riau'),
        ('jambi', 'Jambi'),
        ('sumatera_selatan', 'Sumatera Selatan'),
        ('bengkulu', 'Bengkulu'),
        ('lampung', 'Lampung'),
        ('kepulauan_bangka_belitung', 'Kepulauan Bangka Belitung'),
        ('kepulauan_riau', 'Kepulauan Riau'),
        ('dki_jakarta', 'DKI Jakarta'),
        ('jawa_barat', 'Jawa Barat'),
        ('jawa_tengah', 'Jawa Tengah'),
        ('di_yogyakarta', 'DI Yogyakarta'),
        ('jawa_timur', 'Jawa Timur'),
        ('banten', 'Banten'),
        ('bali', 'Bali'),
        ('nusa_tenggara_barat', 'Nusa Tenggara Barat'),
        ('nusa_tenggara_timur', 'Nusa Tenggara Timur'),
        ('kalimantan_barat', 'Kalimantan Barat'),
        ('kalimantan_tengah', 'Kalimantan Tengah'),
        ('kalimantan_selatan', 'Kalimantan Selatan'),
        ('kalimantan_timur', 'Kalimantan Timur'),
        ('kalimantan_utara', 'Kalimantan Utara'),
        ('sulawesi_utara', 'Sulawesi Utara'),
        ('sulawesi_tengah', 'Sulawesi Tengah'),
        ('sulawesi_selatan', 'Sulawesi Selatan'),
        ('sulawesi_tenggara', 'Sulawesi Tenggara'),
        ('gorontalo', 'Gorontalo'),
        ('sulawesi_barat', 'Sulawesi Barat'),
        ('maluku', 'Maluku'),
        ('maluku_utara', 'Maluku Utara'),
        ('papua', 'Papua'),
        ('papua_barat', 'Papua Barat'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    id_m = models.CharField(max_length=10, blank=True, null=True)
    nik = models.CharField(max_length=16, blank=True, null=True, help_text='Nomor Induk Kependudukan (NIK) dari KTP')
    picture = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    google_picture_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL foto profil dari Google OAuth")
    ktp_image = models.ImageField(upload_to='ktp_images/', blank=True, null=True)
    name_full = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    birth_place = models.CharField(max_length=100, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    registration_date = models.DateField(blank=True, null=True)
    marital_status = models.CharField(max_length=10, choices=MARITAL_CHOICES, blank=True, null=True)
    segment = models.CharField(max_length=10, choices=SEGMENT_CHOICES, blank=True, null=True) 
    study_level = models.CharField(max_length=100, choices=STUDY_LEVEL_CHOICES, blank=True, null=True)
    study_campus = models.CharField(max_length=100, blank=True, null=True)
    study_faculty = models.CharField(max_length=100, blank=True, null=True)
    study_department = models.CharField(max_length=100, blank=True, null=True)
    study_program = models.CharField(max_length=100, blank=True, null=True)
    study_semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(15)], blank=True, null=True)
    study_start_year = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)], blank=True, null=True)
    study_finish_year = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)], blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    job = models.CharField(max_length=100, choices=JOB_CHOICES, blank=True, null=True)  
    work_field = models.CharField(max_length=100, choices=WORK_FIELD_CHOICES, blank=True, null=True)    
    work_institution = models.CharField(max_length=100, blank=True, null=True)
    work_position = models.CharField(max_length=100, blank=True, null=True)
    work_salary = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], blank=True, null=True)
    address_latitude = models.FloatField(blank=True, null=True)
    address_longitude = models.FloatField(blank=True, null=True)  
    address_province = models.CharField(max_length=100, blank=True, null=True)
    address_province_id = models.CharField(max_length=10, blank=True, null=True, help_text="Expedition Province ID")
    address_city_id = models.CharField(max_length=10, blank=True, null=True, help_text="Expedition City ID")
    address_city_name = models.CharField(max_length=100, blank=True, null=True)
    address_subdistrict_id = models.CharField(max_length=10, blank=True, null=True, help_text="Expedition Subdistrict ID")
    address_subdistrict_name = models.CharField(max_length=100, blank=True, null=True)
    address_village_id = models.CharField(max_length=10, blank=True, null=True, help_text="Expedition Village ID")
    address_village_name = models.CharField(max_length=100, blank=True, null=True, help_text="Nama Kelurahan/Desa")
    address_postal_code = models.CharField(max_length=10, blank=True, null=True)
    
    # Fitness & Health Fields (Bae Fit)
    weight = models.FloatField(blank=True, null=True, help_text="Current weight in KG")
    height = models.FloatField(blank=True, null=True, help_text="Height in CM")
    starting_weight = models.FloatField(blank=True, null=True, help_text="Weight when joined")
    age_fitness = models.IntegerField(blank=True, null=True, help_text="Age for fitness analysis")
    activity_level = models.CharField(max_length=20, default='Sedang', choices=[
        ('Rendah', 'Jarang Olahraga'),
        ('Sedang', '1-3x Seminggu'),
        ('Tinggi', 'Setiap Hari')
    ])
    daily_target = models.FloatField(default=5.0, help_text="Daily distance target in KM")
    last_health_check = models.DateTimeField(blank=True, null=True)
    
    # Shop fields for digital product sellers
    shop_thumbnail = models.ImageField(upload_to='shop_thumbnails/', blank=True, null=True)
    shop_description = models.TextField(blank=True, null=True)
    shop_layout = models.CharField(max_length=50, default='default', blank=True)
    shop_theme_color = models.CharField(max_length=50, default='green', blank=True)
    shop_font = models.CharField(max_length=50, default='sans', blank=True)
    shop_decoration = models.CharField(max_length=50, default='none', blank=True)
    shop_template = models.CharField(max_length=50, default='none', blank=True)
    shop_header_style = models.CharField(max_length=50, default='theme', blank=True) # Options: 'theme', 'transparent'
    shop_text_color = models.CharField(max_length=50, default='#ffffff', blank=True)
    shop_supported_couriers = models.CharField(max_length=255, default='jne,pos,tiki,jnt', blank=True, help_text="Comma separated active courier codes")


    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-verify member if essential KTP data or KTP image is provided
        is_verified = (self.nik and self.name_full) or self.ktp_image
        if is_verified and not self.user.is_verified_member:
            self.user.is_verified_member = True
            self.user.save(update_fields=['is_verified_member'])
        
        # Trigger auto-role check
        self.check_auto_roles()

    def check_auto_roles(self):
        """Logic to automatically assign custom roles and verify user based on profile completeness."""
        user = self.user
        from accounts.models import Role
        
        active_roles = Role.objects.filter(is_active=True)
        assigned_new_role = False
        
        for role_obj in active_roles:
            required_fields = set(role_obj.required_profile_fields or [])
            if not required_fields:
                continue 
                
            missing = []
            for field in required_fields:
                val = getattr(self, field, None)
                if not val or (isinstance(val, str) and not val.strip()):
                    missing.append(field)
            
            if not missing:
                if role_obj not in user.custom_roles.all():
                    user.custom_roles.add(role_obj)
                    assigned_new_role = True
                    
        if assigned_new_role and user.role == 'user':
            user.is_verified_member = True
            user.role = 'seller'
            user.save()

    def __str__(self):
        return f'{self.user.username} Profile'

class BusinessProfile(models.Model):
    BIDANG_USAHA_CHOICES = [
        ('kuliner', 'Kuliner'),
        ('fashion', 'Fashion'),
        ('jasa', 'Jasa'),
        ('digital', 'Digital'),
        ('kesehatan', 'Kesehatan'),
        ('pendidikan', 'Pendidikan'),
        ('lainnya', 'Lainnya'),
    ]

    SKALA_USAHA_CHOICES = [
        ('<1jt', '< Rp1 juta'),
        ('1-5jt', 'Rp1 – 5 juta'),
        ('5-10jt', 'Rp5 – 10 juta'),
        ('10-25jt', 'Rp10 – 25 juta'),
        ('25-50jt', 'Rp25 – 50 juta'),
        ('50-100jt', 'Rp50 – 100 juta'),
        ('100-250jt', 'Rp100 – 250 juta'),
        ('>250jt', '> Rp250 juta'),
    ]

    STATUS_USAHA_CHOICES = [
        ('baru', 'Baru mulai'),
        ('berjalan', 'Sudah berjalan'),
        ('stabil', 'Sudah stabil'),
    ]

    AREA_PENJUALAN_CHOICES = [
        ('lokal', 'Lokal'),
        ('nasional', 'Nasional'),
        ('internasional', 'Internasional'),
    ]

    KESIAPAN_ORDER_CHOICES = [
        ('siap', 'Siap'),
        ('belum_siap', 'Belum siap'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_profiles')
    
    # SECTION 1 — DATA ANGGOTA
    full_name = models.CharField(max_length=100)
    community_username = models.CharField(max_length=100, blank=True, null=True)
    whatsapp = models.CharField(max_length=15)

    # SECTION 2 — DATA BISNIS
    brand_name = models.CharField(max_length=100)
    business_field = models.CharField(max_length=20, choices=BIDANG_USAHA_CHOICES)
    business_field_other = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(help_text="Maks. 150 kata")
    main_products = models.TextField()
    business_scale = models.CharField(max_length=20, choices=SKALA_USAHA_CHOICES)
    
    # Positioning
    keunggulan = models.TextField(help_text="Maks. 100 kata")
    target_market = models.TextField()

    # SECTION 3 — MEDIA & KONTAK
    instagram = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    marketplace = models.CharField(max_length=255, blank=True, null=True)
    customer_contact = models.CharField(max_length=15)

    # SECTION 4 — MEDIA UNTUK WEBSITE
    logo = models.ImageField(upload_to='business_logos/')
    foto_produk_1 = models.ImageField(upload_to='business_products/')
    foto_produk_2 = models.ImageField(upload_to='business_products/', blank=True, null=True)
    foto_produk_3 = models.ImageField(upload_to='business_products/', blank=True, null=True)

    # SECTION 5 — STATUS & KESIAPAN
    business_status = models.CharField(max_length=20, choices=STATUS_USAHA_CHOICES)
    sales_area = models.CharField(max_length=20, choices=AREA_PENJUALAN_CHOICES)
    readiness_order = models.CharField(max_length=20, choices=KESIAPAN_ORDER_CHOICES)

    # SECTION 6 — DATA UNTUK WEBSITE (DISPLAY PUBLIK)
    display_name = models.CharField(max_length=100)
    tagline = models.CharField(max_length=255, blank=True, null=True)
    promo_description = models.TextField(help_text="Maks. 100 kata")
    display_contact = models.CharField(max_length=255)
    is_website_display_approved = models.BooleanField(default=False)

    # SECTION 7 — TAMBAHAN (OPSIONAL)
    business_needs = models.JSONField(default=list, blank=True) # Modal, Marketing, etc.
    business_needs_other = models.CharField(max_length=100, blank=True, null=True)
    expectations = models.TextField(blank=True, null=True)

    # Admin Fields
    is_curated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand_name} ({self.user.username})"