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
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0) # total_price + shipping - voucher
    payment_method = models.CharField(max_length=50, default='manual')
    payment_proof = models.ImageField(upload_to='payment_proofs/orders/', null=True, blank=True)


    status = models.CharField(max_length=50, default='Pending')  # e.g., Pending, Shipped, Delivered
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    resi_number = models.CharField(max_length=100, blank=True, null=True)
    buyer_note = models.TextField(blank=True, null=True, help_text="Catatan pembeli untuk penjual")
    
    # Qrisly Integration
    qrisly_history_id = models.CharField(max_length=100, blank=True, null=True)
    qris_payload = models.TextField(blank=True, null=True)



    def save(self, *args, **kwargs):
        # Calculate Grand Total using Decimal for accuracy
        from decimal import Decimal
        tp = Decimal(str(self.total_price or 0))
        sc = Decimal(str(self.shipping_cost or 0))
        vn = Decimal(str(self.voucher_nominal or 0))
        
        self.grand_total = tp + sc - vn
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