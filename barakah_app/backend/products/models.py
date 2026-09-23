# products/models.py
from django.db import models
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
        ('ons', 'ons'),
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
    is_shipping_cost_active = models.BooleanField(default=False, help_text="Aktifkan ongkos kirim flat untuk produk ini")
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Nominal ongkos kirim produk")
    purchase_instructions = models.TextField(blank=True, null=True, help_text="Informasi khusus pengambilan atau teknis setelah pembelian")

    # Jam Operasional Toko
    is_operational_hours_active = models.BooleanField(default=False, help_text="Aktifkan jam operasional toko untuk produk ini")
    operational_hours = models.CharField(max_length=255, blank=True, null=True, help_text="Contoh: Senin - Sabtu, 08:00 - 17:00 WIB")

    # Waktu Pre-Order (PO)
    is_preorder = models.BooleanField(default=False, help_text="Aktifkan sistem Pre-Order (PO)")
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
    out_of_po_shipping_active = models.BooleanField(default=False, help_text="Aktifkan ongkir flat seller / luar jam PO (tetap flat walau beli banyak produk)")
    out_of_po_shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Nominal ongkos kirim flat di luar jam PO")
    allow_delivery_timing_choice = models.BooleanField(default=True, help_text="Izinkan pembeli memilih pengiriman minggu ini atau minggu depannya")


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
