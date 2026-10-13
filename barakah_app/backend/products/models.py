# products/models.py
import datetime
from django.db import models
from django.utils import timezone
from ckeditor.fields import RichTextField
from django.utils.text import slugify

def generate_unique_slug(model, name):
    slug = slugify(name)
    unique_slug = slug
    num = 1
    while model.objects.filter(slug=unique_slug).exists():
        unique_slug = f'{slug}-{num}'
        num += 1
    return unique_slug

STATUS_CHOICES = [
    ('pending', 'Menunggu Persetujuan'),
    ('approved', 'Disetujui'),
    ('rejected', 'Ditolak'),
]

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('sembako', 'Bahan Makanan'),
        ('bumbu', 'Bumbu'),
        ('sayuran', 'Sayuran'),
        ('buah', 'Buah buahan'),
        ('protein', 'Bahan Protein'),
        ('mentahan', 'Bahan Makanan'),
        ('makan-minum', 'Makanan & Minuman'),
        ('obat', 'Produk Obat obatan'),
        ('herbal', 'Produk Herbal'),
        ('elektronik', 'Barang Elektronik'),
        ('peralatan', 'Peralatan Pertukangan'),
        ('pakaian', 'Pakaian'),
        ('asesoris', 'Asesoris'),
        ('perabotan', 'Perabotan Rumah'),
        ('kesehatan', 'Kesehatan'),
        ('kecantikan', 'Kecantikan'),
        ('kebersihan', 'Kebersihan'),
        ('perawatan', 'Perawatan'),
        ('kendaraan', 'Kendaraan'),
        ('rumah', 'Rumah'),
        ('gadget', 'Gadget'),
        ('lainnya', 'Lainnya'),
    ]

    UNIT_CHOICES = [
        ('pcs', 'pcs / buah'),
        ('buku', 'buku / eksemplar'),
        ('eksemplar', 'eksemplar'),
        ('lembar', 'lembar'),
        ('jilid', 'jilid'),
        ('kg', 'kg (Kilogram)'),
        ('gram', 'gram (g)'),
        ('50 gram', '50 gram'),
        ('100 gram', '100 gram'),
        ('200 gram', '200 gram'),
        ('250 gram', '250 gram'),
        ('500 gram', '500 gram'),
        ('ons', 'ons'),
        ('ikat', 'ikat'),
        ('liter', 'liter (L)'),
        ('ml', 'mililiter (ml)'),
        ('pack', 'pack / bungkus'),
        ('box', 'box / kotak'),
        ('dus', 'dus / karton'),
        ('botol', 'botol'),
        ('sachet', 'sachet'),
        ('kaleng', 'kaleng'),
        ('pasang', 'pasang'),
        ('set', 'set'),
        ('unit', 'unit'),
        ('porsi', 'porsi'),
        ('lusin', 'lusin (12 pcs)'),
        ('kodi', 'kodi (20 pcs)'),
        ('meter', 'meter (m)'),
        ('paket', 'paket'),
    ]

    title = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='lainnya')
    thumbnail = models.ImageField(upload_to='product_images/', blank=True, null=True)
    
    # Sinergy / Physical Attributes
    seller = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='physical_products', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    weight = models.PositiveIntegerField(default=1000, help_text="Berat dalam gram")
    supported_couriers = models.CharField(max_length=255, default='jne,pos,tiki,jnt', blank=True, help_text="Comma separated active courier codes for this product")
    is_cod_available = models.BooleanField(default=False, help_text="Apakah produk ini mendukung COD")
    is_shipping_cost_active = models.BooleanField(default=False, help_text="Aktifkan ongkos kirim toko untuk produk ini")
    shipping_cost_type = models.CharField(
        max_length=20,
        choices=[('flat', 'Flat Ongkir'), ('distance', 'Sesuai Jarak')],
        default='flat',
        blank=True,
        null=True,
        help_text="Tipe ongkos kirim: flat atau distance (sesuai jarak)"
    )
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Nominal ongkos kirim produk")
    purchase_instructions = models.TextField(blank=True, null=True, help_text="Informasi khusus pengambilan atau teknis setelah pembelian")

    # Pengaturan Operasional & PO (Toko vs Custom Produk)
    use_store_operational_settings = models.BooleanField(default=True, help_text="Jika True, mengikuti pengaturan global toko. Jika False, menggunakan pengaturan custom di bawah.")

    # Jam Operasional Toko
    is_operational_hours_active = models.BooleanField(default=False, help_text="Aktifkan jam operasional toko untuk produk ini")
    operational_hours = models.CharField(max_length=255, blank=True, null=True, help_text="Contoh: Senin - Sabtu, 08:00 - 17:00 WIB")

    # Waktu Pre-Order (PO)
    is_preorder = models.BooleanField(default=False, help_text="Aktifkan sistem Pre-Order (PO)")
    preorder_type = models.CharField(
        max_length=20,
        choices=[('days', 'Hari Tertentu'), ('range', 'Rentang Hari')],
        default='days',
        blank=True,
        null=True,
        help_text="Tipe PO: days (hari tertentu) atau range (rentang hari)"
    )
    preorder_days = models.CharField(max_length=255, blank=True, null=True, help_text="Hari PO, misal: 'Senin, Rabu, Jumat'")
    preorder_days_min = models.PositiveIntegerField(blank=True, null=True, help_text="Minimal hari PO")
    preorder_days_max = models.PositiveIntegerField(blank=True, null=True, help_text="Maksimal hari PO")
    preorder_duration = models.CharField(max_length=100, blank=True, null=True, help_text="Label rentang hari PO, contoh: 3 - 7 Hari")

    # Tanggal / Jadwal Pengantaran
    is_delivery_schedule_active = models.BooleanField(default=False, help_text="Aktifkan jadwal / tanggal pengantaran")
    delivery_schedule_type = models.CharField(
        max_length=20,
        choices=[('range', 'Rentang Hari'), ('days', 'Hari Tertentu'), ('date', 'Tanggal Spesifik')],
        default='range',
        blank=True,
        null=True
    )
    delivery_range_min = models.PositiveIntegerField(blank=True, null=True, help_text="Estimasi pengantaran min hari")
    delivery_range_max = models.PositiveIntegerField(blank=True, null=True, help_text="Estimasi pengantaran max hari")
    delivery_days = models.CharField(max_length=255, blank=True, null=True, help_text="Hari pengantaran, misal: 'Senin, Rabu, Jumat'")
    delivery_date = models.DateField(blank=True, null=True, help_text="Tanggal pengantaran spesifik")
    delivery_note = models.CharField(max_length=255, blank=True, null=True, help_text="Catatan pengantaran, misal: 'Pengiriman mulai pukul 10:00 WIB'")

    # Ongkir Khusus Luar Jam PO & Fleksibilitas Pengiriman
    out_of_po_shipping_active = models.BooleanField(default=False, help_text="Aktifkan ongkir seller / luar jam PO")
    out_of_po_shipping_type = models.CharField(
        max_length=20,
        choices=[('flat', 'Flat Ongkir'), ('distance', 'Sesuai Jarak')],
        default='flat',
        blank=True,
        null=True,
        help_text="Tipe ongkir luar jam PO: flat atau distance (sesuai jarak)"
    )
    out_of_po_shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Nominal ongkos kirim flat di luar jam PO")
    allow_delivery_timing_choice = models.BooleanField(default=False, help_text="Izinkan pembeli memilih pengiriman minggu ini atau minggu depannya")


    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Harga Beli")
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Harga Jual") # selling_price
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='pcs')
    stock = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)
    likes = models.ManyToManyField('accounts.User', related_name='liked_products', blank=True)
    own_bank_name = models.CharField(max_length=100, blank=True, null=True)
    own_bank_account = models.CharField(max_length=100, blank=True, null=True)
    own_bank_holder = models.CharField(max_length=150, blank=True, null=True)
    own_qris_image = models.ImageField(upload_to='seller_qris/', blank=True, null=True)
    own_bank_status = models.CharField(
        max_length=20, 
        choices=[
            ('none', 'Tidak Menggunakan'), 
            ('pending', 'Menunggu Persetujuan'), 
            ('approved', 'Disetujui'), 
            ('rejected', 'Ditolak')
        ], 
        default='none'
    )
    manual_sold_count = models.IntegerField(default=0, help_text="Jumlah terjual tambahan / penyesuaian manual oleh admin")
    created_at = models.DateTimeField(auto_now_add=True)

    def sync_variations(self):
        """Update product stock and price based on variations."""
        variations = self.variations.filter(is_active=True)
        if variations.exists():
            # Total stock is sum of variation stocks
            self.stock = sum(v.stock for v in variations)
            
            # Find min and max prices
            prices = []
            for v in variations:
                # If additional_price is used as absolute price (as per current view logic)
                v_price = v.additional_price if v.additional_price > 0 else self.price
                prices.append(v_price)
            
            if prices:
                self.price = min(prices) # Base price becomes the minimum
            self.save(update_fields=['stock', 'price'])

    @property
    def store_sold_count(self):
        if hasattr(self, 'annotated_store_sold') and self.annotated_store_sold is not None:
            return self.annotated_store_sold
        from orders.models import OrderItem
        from django.db.models import Sum
        return OrderItem.objects.filter(product=self).exclude(
            order__status__in=['Batal', 'batal', 'Cancelled', 'cancelled', 'Dibatalkan', 'dibatalkan', 'Rejected', 'rejected']
        ).aggregate(total=Sum('quantity'))['total'] or 0

    @property
    def charity_sold_count(self):
        if hasattr(self, 'annotated_charity_sold') and self.annotated_charity_sold is not None:
            return self.annotated_charity_sold
        from donations.models import DonationWaqafItem
        from django.db.models import Sum
        return DonationWaqafItem.objects.filter(product=self).exclude(
            donation__payment_status__in=['rejected', 'batal']
        ).aggregate(total=Sum('quantity'))['total'] or 0

    @property
    def sold_count(self):
        return (self.store_sold_count or 0) + (self.charity_sold_count or 0) + (self.manual_sold_count or 0)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Product, self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title}"

class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='product_gallery/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class ProductVariation(models.Model):
    product = models.ForeignKey(Product, related_name='variations', on_delete=models.CASCADE)
    sku = models.CharField(max_length=50, unique=True, blank=True)
    name = models.CharField(max_length=100) # e.g. "Merah - XL"
    additional_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.product.title} - {self.name}"

class ShopVoucher(models.Model):
    seller = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='vouchers')
    code = models.CharField(max_length=30, unique=True)
    nominal = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.IntegerField(default=-1, help_text="-1 for unlimited")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - Rp {self.nominal}"

class Testimoni(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='testimonies')
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='product_testimonies')
    customer = models.CharField(max_length=100)
    stars = models.IntegerField(default=5)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='product_testimonies/', blank=True, null=True)
    is_admin_entry = models.BooleanField(default=False, help_text="Diinput secara manual oleh admin")
    edit_count = models.IntegerField(default=0, help_text="Jumlah kali ulasan telah diedit oleh pembeli (maksimal 1x)")
    can_edit_by_admin = models.BooleanField(default=False, help_text="Akses edit dibuka / direset khusus oleh admin")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def can_edit(self):
        if self.can_edit_by_admin:
            return True
        return self.edit_count < 1

    def __str__(self):
        return f"{self.customer} - {self.product.title} ({self.stars} stars, edits: {self.edit_count})"


class ProductPromotion(models.Model):
    PROMO_TYPE_CHOICES = [
        ('percentage', 'Diskon Persentase (%)'),
        ('nominal', 'Potongan Tetap (Rp)'),
        ('min_qty_discount', 'Diskon Grosir (Beli >= X Qty)'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='promotions')
    title = models.CharField(max_length=150, help_text="Nama Promo / Kampanye")
    discount_type = models.CharField(max_length=30, choices=PROMO_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=12, decimal_places=2, help_text="Nilai Diskon (% atau Rp)")
    min_quantity = models.PositiveIntegerField(default=1, help_text="Minimal jumlah beli untuk promo grosir")
    is_min_qty_percentage = models.BooleanField(default=True, help_text="Jika grosir, nilai diskon berupa % (True) atau Rp (False)")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.product.title}"      


class ServiceItem(models.Model):
    SERVICE_CATEGORY_CHOICES = [
        ('elektronik_it', 'Elektronik & IT'),
        ('desain_kreatif', 'Desain & Kreatif'),
        ('rumah_tukang', 'Pertukangan & Rumah Tangga'),
        ('pendidikan_kursus', 'Pendidikan & Kursus'),
        ('kesehatan_terapi', 'Kesehatan & Terapi'),
        ('bisnis_legal', 'Bisnis, Keuangan & Legal'),
        ('transportasi_logistik', 'Transportasi & Logistik'),
        ('acara_fotografi', 'Acara & Fotografi'),
        ('kebersihan_laundry', 'Kebersihan & Laundry'),
        ('otomotif', 'Servis Otomotif'),
        ('kuliner_katering', 'Katering & Jasa Kuliner'),
        ('lainnya', 'Layanan Lainnya'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Menunggu Persetujuan'),
        ('approved', 'Disetujui'),
        ('rejected', 'Ditolak'),
    ]

    seller = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    category = models.CharField(max_length=50, choices=SERVICE_CATEGORY_CHOICES, default='lainnya')
    description = models.TextField(blank=True, default='')
    thumbnail = models.ImageField(upload_to='service_images/', blank=True, null=True)
    
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tarif Harga")
    price_rate = models.CharField(max_length=50, default='/jam', help_text="Satuan tarif: /jam, /hari, /proyek, /sesi, Mulai dari, dll")
    
    whatsapp_number = models.CharField(max_length=30, blank=True, null=True, help_text="Nomor WhatsApp untuk pesanan jasa")
    whatsapp_message = models.TextField(blank=True, default='', help_text="Template pesan pembuka WhatsApp otomatis")
    location_city = models.CharField(max_length=100, blank=True, null=True, help_text="Kota/Wilayah jangkauan jasa")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    views_count = models.PositiveIntegerField(default=0)
    likes = models.ManyToManyField('accounts.User', related_name='liked_services', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(ServiceItem, self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.seller.username} ({self.status})"


# ==============================================================================
# LANDING PAGE BUILDER & QUOTA MANAGEMENT MODELS
# ==============================================================================

class LandingPageSlotSetting(models.Model):
    """Pengaturan harga, kuota gratis & langganan landing page oleh admin (Singleton)."""
    FREE_DURATION_CHOICES = [
        ('1_month', '1 Bulan Free (30 Hari)'),
        ('forever', 'Free Selamanya'),
        ('custom_days', 'Kustom Jumlah Hari'),
    ]

    price_per_slot = models.DecimalField(max_digits=12, decimal_places=2, default=50000, help_text="Harga penambahan 1 slot Landing Page (Rp)")
    free_quota = models.PositiveIntegerField(default=1, help_text="Jumlah landing page gratis pertama per user")
    free_duration_type = models.CharField(
        max_length=20, 
        choices=FREE_DURATION_CHOICES, 
        default='1_month', 
        help_text="Durasi aktif gratis untuk LP default"
    )
    default_free_days = models.PositiveIntegerField(
        default=30, 
        help_text="Jumlah hari masa aktif jika memilih 1 bulan atau kustom hari"
    )
    subscription_price_monthly = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=25000, 
        help_text="Harga langganan / perpanjangan per bulan (Rp)"
    )
    is_active = models.BooleanField(default=True)
    instructions = models.TextField(
        blank=True, 
        default="Biaya penambahan kuota & langganan masa aktif Landing Page. Pembayaran otomatis diverifikasi via QRIS / Notifikasi Transfer Bank Barakah.",
        help_text="Petunjuk pembayaran"
    )
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj

    def __str__(self):
        return f"Setting Slot LP (Rp {self.price_per_slot:,.0f} / slot, Gratis: {self.free_quota}, Langganan: Rp {self.subscription_price_monthly:,.0f}/bln)"


class LandingPageQuota(models.Model):
    """Menyimpan kuota tambahan berbayar milik pengguna."""
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='lp_quota')
    extra_slots = models.PositiveIntegerField(default=0, help_text="Jumlah slot tambahan yang telah dibeli & aktif")
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_allowed(self):
        setting = LandingPageSlotSetting.get_settings()
        return setting.free_quota + self.extra_slots

    def __str__(self):
        return f"Quota LP {self.user.username}: {self.extra_slots} extra slots"


class LandingPageSlotOrder(models.Model):
    """Transaksi pembelian slot Landing Page atau perpanjangan masa aktif (langganan) dengan auto-sync listener."""
    STATUS_CHOICES = [
        ('pending', 'Menunggu Pembayaran'),
        ('paid', 'Lunas / Berhasil'),
        ('cancelled', 'Dibatalkan'),
        ('expired', 'Kadaluarsa'),
    ]

    ORDER_TYPE_CHOICES = [
        ('slot', 'Beli Slot Ekstra'),
        ('renewal', 'Perpanjang Masa Aktif / Langganan'),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='lp_orders')
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='slot')
    landing_page = models.ForeignKey('LandingPage', on_delete=models.SET_NULL, null=True, blank=True, related_name='renewal_orders')
    duration_months = models.PositiveIntegerField(default=1, help_text="Durasi perpanjangan (bulan)")
    slots_count = models.PositiveIntegerField(default=1)
    base_amount = models.DecimalField(max_digits=12, decimal_places=2)
    unique_code = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total tagihan (base_amount + unique_code)")
    payment_method = models.CharField(max_length=30, default='dynaqris')
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} ({self.order_type}) - {self.user.username} (Rp {self.amount:,.0f} - {self.payment_status})"


class LandingPage(models.Model):
    """Landing Page Kustom buatan Seller / Pengguna dengan kontrol penuh."""
    THEME_CHOICES = [
        ('emerald', 'Emerald Islamic & Heritage'),
        ('modern_dark', 'Dark Luxury Mode'),
        ('clean_white', 'Clean Minimalist White'),
        ('sunset_amber', 'Sunset Amber Warmth'),
        ('ocean_blue', 'Ocean Deep Blue'),
        ('luxury_gold', 'Royal Gold Accent'),
        ('rose_elegance', 'Rose Elegance'),
    ]

    LAYOUT_CHOICES = [
        ('standard', 'Standard Long-Form Sales Page'),
        ('centered_hero', 'Hero Centered Minimalist'),
        ('biolink_style', 'Biolink & Fast Action'),
        ('split_banner', 'Split Banner Showcase'),
        ('grid_showcase', 'Grid Product Showcase'),
    ]

    FONT_CHOICES = [
        ('poppins', 'Poppins (Modern & Bersih)'),
        ('plus-jakarta', 'Plus Jakarta Sans (Elegan & Resmi)'),
        ('inter', 'Inter (Teknis & Standar)'),
        ('outfit', 'Outfit (Futuristik & Trendy)'),
        ('serif', 'Serif / Editorial (Klasik & Premium)'),
        ('mono', 'Monospace (Unik & Modern)'),
    ]

    CTA_TYPE_CHOICES = [
        ('whatsapp', 'Chat WhatsApp Otomatis'),
        ('direct_link', 'Direct Link / URL Eksternal'),
        ('checkout', 'Langsung Beli / Checkout'),
    ]

    seller = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='landing_pages')
    title = models.CharField(max_length=200, help_text="Nama Toko atau Judul Landing Page")
    slug = models.SlugField(max_length=220, unique=True, blank=True, help_text="URL publik: /lp/{slug}")
    tagline = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='', help_text="Deskripsi atau copywriting utama")

    # Branding & Banner
    logo = models.ImageField(upload_to='landing_pages/logos/', blank=True, null=True)
    hero_image = models.ImageField(upload_to='landing_pages/heroes/', blank=True, null=True)
    hero_headline = models.CharField(max_length=255, blank=True, default='')
    hero_subheadline = models.TextField(blank=True, default='')

    # Pricing & Discounts
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Nominal Harga Produk/Jasa")
    slash_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Harga Coret (Sebelum Diskon)")
    badge_text = models.CharField(max_length=100, blank=True, default='', help_text="Label promo, misal: 'PROMO DISKON 50%', 'BEST SELLER'")

    # Call-to-Action (CTA) & Custom Buttons
    cta_text = models.CharField(max_length=100, default='Beli Sekarang', help_text="Teks tombol CTA utama")
    cta_subtext = models.CharField(max_length=150, blank=True, default='', help_text="Subteks penenang, misal: 'Garansi 100% Uang Kembali'")
    cta_type = models.CharField(max_length=50, default='whatsapp', choices=CTA_TYPE_CHOICES)
    cta_link = models.CharField(max_length=500, blank=True, default='', help_text="Direct link tujuan (URL atau wa.me)")
    whatsapp_number = models.CharField(max_length=30, blank=True, default='', help_text="Nomor WhatsApp (contoh: 628123456789)")
    whatsapp_message = models.TextField(blank=True, default='', help_text="Template pesan WhatsApp pembuka otomatis")
    
    secondary_cta_text = models.CharField(max_length=100, blank=True, default='')
    secondary_cta_link = models.CharField(max_length=500, blank=True, default='')

    # Styling, Warna, Font, Layout & Tema
    theme = models.CharField(max_length=50, default='emerald', choices=THEME_CHOICES)
    layout = models.CharField(max_length=50, default='standard', choices=LAYOUT_CHOICES)
    font_family = models.CharField(max_length=50, default='poppins', choices=FONT_CHOICES)
    
    primary_color = models.CharField(max_length=50, default='#10b981', help_text="Warna utama / tombol / aksen")
    secondary_color = models.CharField(max_length=50, default='#047857', help_text="Warna sekunder / gradasi")
    background_color = models.CharField(max_length=50, default='#f8fafc', help_text="Warna latar belakang container")
    text_color = models.CharField(max_length=50, default='#0f172a', help_text="Warna teks utama")
    button_color = models.CharField(max_length=50, default='#10b981', help_text="Warna tombol CTA")
    button_text_color = models.CharField(max_length=50, default='#ffffff', help_text="Warna teks tombol CTA")

    # Dynamic JSON Sections (Carousel, Keunggulan, Testimoni, FAQ, Galeri, Paragraf, Urutan Drag & Drop)
    carousel_images = models.JSONField(default=list, blank=True, help_text="Daftar URL gambar carousel")
    features = models.JSONField(default=list, blank=True, help_text="List keunggulan [{title, description, icon}]")
    testimonials = models.JSONField(default=list, blank=True, help_text="List ulasan [{name, review, rating, avatar}]")
    faq_items = models.JSONField(default=list, blank=True, help_text="List tanya jawab [{question, answer}]")
    paragraphs = models.JSONField(default=list, blank=True, help_text="List paragraf / narasi copywriting [{headline, content}]")
    sections_order = models.JSONField(default=list, blank=True, help_text="Urutan blok komponen landing page (drag & drop)")

    # Meta & Status
    views_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False, help_text="Status publish (Jika False = Draft/Edit belum dihitung masa aktifnya)")
    published_at = models.DateTimeField(null=True, blank=True, help_text="Waktu pertama kali dipublish")
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Tanggal berakhir masa aktif LP (null jika free selamanya)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_expired(self):
        """Cek apakah masa aktif landing page telah habis."""
        setting = LandingPageSlotSetting.get_settings()
        if setting.free_duration_type == 'forever' and not self.expires_at:
            return False
        if not self.is_published:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False

    @property
    def days_remaining(self):
        """Sisa hari aktif landing page."""
        if not self.expires_at:
            return None
        diff = (self.expires_at - timezone.now()).total_seconds()
        return max(0, int(diff // 86400))

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(LandingPage, self.title)

        # Usia landing page dihitung hanya ketika diaktifkan / dipublish
        if self.is_published:
            setting = LandingPageSlotSetting.get_settings()
            if not self.published_at:
                self.published_at = timezone.now()
            if not self.expires_at:
                if setting.free_duration_type == 'forever':
                    self.expires_at = None
                else:
                    days = setting.default_free_days if setting.free_duration_type == 'custom_days' else 30
                    self.expires_at = timezone.now() + datetime.timedelta(days=days)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (/lp/{self.slug}) - {self.seller.username}"

