# digital_products/models.py
from django.db import models
from django.utils.text import slugify
from accounts.models import User
import uuid
import os


def digital_product_image_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('digital_products', filename)


def digital_order_proof_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('digital_order_proofs', filename)


def generate_unique_slug(model, name):
    slug = slugify(name)
    unique_slug = slug
    num = 1
    while model.objects.filter(slug=unique_slug).exists():
        unique_slug = f'{slug}-{num}'
        num += 1
    return unique_slug


    VISIBILITY_CHOICES = [
        ('global', 'Global'),
        ('exclusive', 'Exclusive'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='digital_products')
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='lainnya')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='global')
    thumbnail = models.ImageField(upload_to=digital_product_image_path, blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    digital_link = models.URLField(max_length=500, help_text="Link produk digital (e.g., lynk.id, Google Drive, dll)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(DigitalProduct, self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} by {self.user.username}"

    class Meta:
        ordering = ['-created_at']


class DigitalOrder(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    order_number = models.CharField(max_length=30, unique=True, blank=True)
    digital_product = models.ForeignKey(DigitalProduct, on_delete=models.CASCADE, related_name='orders')
    product_owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='digital_sales')
    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='digital_orders')
    buyer_name = models.CharField(max_length=100)
    buyer_email = models.EmailField()
    buyer_phone = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_proof = models.FileField(upload_to=digital_order_proof_path, blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    ocr_verified = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk:
            super().save(*args, **kwargs)
        if not self.order_number:
            self.order_number = f"DIG-{self.id:06d}"
            kwargs['force_insert'] = False
            super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.buyer_name} - {self.digital_product.title}"

    class Meta:
        ordering = ['-created_at']


class EmailSettings(models.Model):
    """
    Singleton model — pengaturan email pengirim.
    Hanya boleh ada 1 record. Dikelola dari Django Admin.
    """
    email_host = models.CharField(max_length=255, default='smtp.gmail.com', verbose_name='SMTP Host')
    email_port = models.PositiveIntegerField(default=587, verbose_name='SMTP Port')
    email_use_tls = models.BooleanField(default=True, verbose_name='Gunakan TLS')
    email_host_user = models.EmailField(verbose_name='Email Pengirim', help_text='Alamat email yang digunakan untuk mengirim (e.g., barakaheconomy@gmail.com)')
    email_host_password = models.CharField(max_length=255, verbose_name='App Password', help_text='App Password Gmail (bukan password akun biasa). Buat di: Google Account > Security > 2-Step Verification > App Passwords')
    sender_name = models.CharField(max_length=100, default='Barakah Economy', verbose_name='Nama Pengirim')

    class Meta:
        verbose_name = 'Pengaturan Email'
        verbose_name_plural = 'Pengaturan Email'

    def __str__(self):
        return f"Email Settings ({self.email_host_user})"

    def save(self, *args, **kwargs):
        # Enforce singleton — hanya 1 record
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class WithdrawalRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='withdrawal_requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    donation_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    admin_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deduction = models.DecimalField(max_digits=12, decimal_places=2)
    account_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=50)
    bank_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Withdrawal {self.id} - {self.user.username} - {self.status}"

    class Meta:
        ordering = ['-created_at']
