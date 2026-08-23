# orders/models.py
from django.db import models
from accounts.models import User
from products.models import Product, ProductVariation

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales_orders', null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2) # Product(s) Total
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_courier = models.CharField(max_length=50, blank=True, null=True)
    shipping_service = models.CharField(max_length=50, blank=True, null=True)
    voucher_code = models.CharField(max_length=50, blank=True, null=True)
    voucher_nominal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    admin_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Biaya Layanan & Admin / Kode Unik")
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0) # total_price + shipping - voucher + admin_fee
    payment_method = models.CharField(max_length=50, default='manual')
    payment_proof = models.ImageField(upload_to='payment_proofs/orders/', null=True, blank=True)
    used_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Jumlah Saldo BAE yang digunakan")

    status = models.CharField(max_length=50, default='Pending')  # e.g., Pending, Paid, Proses, Dikirim, Selesai, Batal
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    shipping_type = models.CharField(
        max_length=50, 
        choices=[
            ('ekspedisi', 'Ekspedisi / Kurir Logistik'),
            ('kurir_toko', 'Kirim Sendiri / Kurir Toko')
        ], 
        default='ekspedisi', 
        blank=True, 
        null=True
    )
    resi_number = models.CharField(max_length=100, blank=True, null=True)
    driver_name = models.CharField(max_length=150, blank=True, null=True, help_text="Nama kurir / pengirim jika kirim sendiri")
    driver_phone = models.CharField(max_length=50, blank=True, null=True, help_text="No telp / WA pengirim jika kirim sendiri")
    delivery_date = models.DateField(null=True, blank=True, help_text="Tanggal rencana pengiriman kurir toko")
    delivery_time_slot = models.CharField(max_length=50, blank=True, null=True, help_text="Slot jam pengantaran: 08:00 - 12:00, 12:00 - 15:00, 15:00 - 18:00, 18:00 - 21:00")
    shipping_schedule_type = models.CharField(max_length=20, default='days', blank=True, null=True, help_text="Mode jadwal pengantaran: days / slot / instant")
    cod_amount_to_pay = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Total nominal uang tunai yang harus disiapkan pembeli (COD produk / ongkir ekspedisi COD)")
    shipped_at = models.DateTimeField(null=True, blank=True)
    estimated_delivery_days = models.IntegerField(default=3)
    auto_complete_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    buyer_note = models.TextField(blank=True, null=True, help_text="Catatan pembeli untuk penjual")
    complaint_reason = models.TextField(blank=True, null=True, help_text="Alasan komplain / banding dari pembeli")
    complaint_at = models.DateTimeField(null=True, blank=True)
    
    # Cancellation & Dispute Workflow
    cancel_request_status = models.CharField(
        max_length=20, 
        choices=[
            ('none', 'None'),
            ('pending', 'Menunggu Persetujuan Penjual'),
            ('approved', 'Disetujui Penjual'),
            ('rejected', 'Ditolak Penjual')
        ], 
        default='none'
    )
    cancel_request_reason = models.TextField(blank=True, null=True, help_text="Alasan permohonan pembatalan/diskusi dari pembeli")
    cancel_requested_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_orders')

    paid_to_seller_directly = models.BooleanField(default=False)
    seller_bank_name = models.CharField(max_length=100, blank=True, null=True)
    seller_bank_account = models.CharField(max_length=100, blank=True, null=True)
    seller_bank_holder = models.CharField(max_length=150, blank=True, null=True)
    seller_qris_image = models.ImageField(upload_to='seller_qris_orders/', blank=True, null=True)
    
    # Qrisly Integration
    qrisly_history_id = models.CharField(max_length=100, blank=True, null=True)
    qris_payload = models.TextField(blank=True, null=True)

    # Detailed Recipient & Shipping Address (from profile or custom saved address)
    recipient_name = models.CharField(max_length=150, blank=True, null=True)
    recipient_phone = models.CharField(max_length=50, blank=True, null=True)
    shipping_address = models.TextField(blank=True, null=True)
    shipping_village = models.CharField(max_length=100, blank=True, null=True)
    shipping_district = models.CharField(max_length=100, blank=True, null=True)
    shipping_city = models.CharField(max_length=100, blank=True, null=True)
    shipping_province = models.CharField(max_length=100, blank=True, null=True)
    shipping_postal_code = models.CharField(max_length=20, blank=True, null=True)
    shipping_address_detail = models.TextField(blank=True, null=True)
    shipping_coordinates = models.CharField(max_length=100, blank=True, null=True)



    def save(self, *args, **kwargs):
        # Calculate Grand Total using Decimal for accuracy
        from decimal import Decimal
        tp = Decimal(str(self.total_price or 0))
        sc = Decimal(str(self.shipping_cost or 0))
        vn = Decimal(str(self.voucher_nominal or 0))
        af = Decimal(str(self.admin_fee or 0))
        
        self.grand_total = tp + sc - vn + af
        if self.grand_total < 0:
            self.grand_total = Decimal('0')

        super().save(*args, **kwargs)
        
        if not self.order_number:
            self.order_number = f"ORD-{self.user.id:03d}-{self.id:04d}"
            super().save(update_fields=['order_number'])

    def __str__(self):
        return f"Order {self.order_number} by {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variation = models.ForeignKey(ProductVariation, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        var_str = f" ({self.variation.name})" if self.variation else ""
        return f"{self.quantity} x {self.product.title}{var_str} in Order {self.order.id}"