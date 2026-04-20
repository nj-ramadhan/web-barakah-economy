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
        ('kg', 'kg'),
        ('m', 'meter'),
        ('pcs', 'butir'),
        ('pack', 'bungkus'),
        ('unit', 'unit'),
        ('set', 'set'),
        ('package', 'paket'),
    ]

    title = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='product_images/')
    
    # Sinergy / Physical Attributes
    seller = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='physical_products', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    weight = models.PositiveIntegerField(default=1000, help_text="Berat dalam gram")
    supported_couriers = models.CharField(max_length=255, default='jne,pos,tiki,jnt', blank=True, help_text="Comma separated active courier codes for this product")


    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Harga Beli")
    price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Harga Jual") # selling_price
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    unit = models.CharField(max_length=12, choices=UNIT_CHOICES, default='kg')
    stock = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

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
    customer = models.CharField(max_length=100)
    stars = models.IntegerField(default=5)
    description = RichTextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer}"      
