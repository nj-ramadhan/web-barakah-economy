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
    picture = models.ImageField(upload_to='profile_images/', blank=True, null=True)
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
    study_start_year = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2025)], blank=True, null=True)
    study_finish_year = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2025)], blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    job = models.CharField(max_length=100, choices=JOB_CHOICES, blank=True, null=True)  
    work_field = models.CharField(max_length=100, choices=WORK_FIELD_CHOICES, blank=True, null=True)    
    work_institution = models.CharField(max_length=100, blank=True, null=True)
    work_position = models.CharField(max_length=100, blank=True, null=True)
    work_salary = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], blank=True, null=True)
    address_latitude = models.FloatField(blank=True, null=True)
    address_longitude = models.FloatField(blank=True, null=True)  
    address_province = models.CharField(max_length=50, choices=PROVINCE_CHOICES, blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} Profile'