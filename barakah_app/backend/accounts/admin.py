# accounts/admin.py
from django.contrib import admin
from django import forms
from .models import User, Role, UserLabel, LingkupTugas, BidangTugas

# Define all available menu keys from the frontend (DashboardPage.js)
MENU_CHOICES = [
    ('*', 'SEMUA AKSES (Super Admin)'),
    ('sinergy_products', 'E-commerce: Tambah/Kelola Produk Fisik'),
    ('admin_sinergy', 'E-commerce: Manajemen Produk (Admin)'),
    ('withdrawals', 'Keuangan: Manajemen Penarikan'),
    ('transactions', 'Keuangan: Riwayat Transaksi'),
    ('charity', 'Charity: Manajemen Kampanye & Donasi'),
    ('campaign_approval', 'Charity: Persetujuan Kampanye'),
    ('articles', 'Konten: Manajemen Artikel'),
    ('activities', 'Konten: Manajemen Kegiatan & Berita'),
    ('testimonials', 'Konten: Manajemen Testimoni'),
    ('forum', 'Konten: Manajemen Forum'),
    ('admin_events', 'Event: Manajemen Event & Rekap'),
    ('photo_framer', 'Event: Bingkai Foto Otomatis'),
    ('users', 'Sistem: Manajemen Data User'),
    ('roles', 'Sistem: Manajemen Role & Akses Menu'),
    ('zis_management', 'Keuangan: Manajemen & Verifikasi ZIS'),
    ('announcements', 'Konten: Manajemen Pengumuman & Iklan'),
    ('partners', 'Sistem: Manajemen Partner Bisnis (Admin)'),
    ('consultants', 'Sistem: Manajemen Konsultan (Admin)'),
    ('about_us', 'Sistem: Edit Tentang Kami (Admin)'),

    ('digital_products', 'Bisnis: Produk Digital Saya'),
    ('my_ecourses', 'Bisnis: E-Course Saya'),
    ('view_shop', 'Bisnis: Lihat Toko'),
    ('shop_settings', 'Bisnis: Pengaturan Toko'),
    ('business_data', 'Bisnis: Pendataan Partner Bisnis'),
    ('my_testimonials', 'Personal: Testimoni Saya'),
    ('submit_campaign', 'Personal: Ajukan Kampanye'),
    ('write_article', 'Personal: Tulis Artikel'),
    ('my_events', 'Personal: Event Barakah'),
    ('internal_meetings', 'Admin: Rapat & Manajemen Rapat'),
    ('zis_routine', 'Personal: ZIS Rutin'),
]

class RoleForm(forms.ModelForm):
    accessible_menus = forms.MultipleChoiceField(
        choices=MENU_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        help_text="Pilih menu dashboard yang bisa diakses oleh role ini."
    )

    class Meta:
        model = Role
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Convert JSON list from DB to Python list for the field
        if self.instance and self.instance.accessible_menus:
            self.initial['accessible_menus'] = self.instance.accessible_menus

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    form = RoleForm
    list_display = ('name', 'code', 'is_automatic', 'is_active', 'created_at')
    list_filter = ('is_automatic', 'is_active')
    search_fields = ('name', 'code', 'description')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_verified_member', 'is_staff')
    list_filter = ('role', 'is_verified_member', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'phone')
    filter_horizontal = ('custom_roles', 'labels', 'lingkup_tugas', 'bidang_tugas')

admin.site.register(UserLabel)
admin.site.register(LingkupTugas)
admin.site.register(BidangTugas)