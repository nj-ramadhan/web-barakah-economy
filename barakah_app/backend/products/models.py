from django.db import models

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('sembako', 'Bahan Makanan'),
        ('makan-minum', 'Makanan & Minuman'),
        ('obat', 'Produk Obat obatan'),
        ('elektronik', 'Barang Elektronik'),
        ('peralatan', 'Peralatan Pertukangan'),
        ('gadget', 'Gadget'),
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
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='product_images/')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=12, choices=UNIT_CHOICES, default='kg')
    stock = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"   
