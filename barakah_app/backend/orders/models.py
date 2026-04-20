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

    status = models.CharField(max_length=50, default='Pending')  # e.g., Pending, Shipped, Delivered
    order_number = models.CharField(max_length=20, unique=True, blank=True)

    def save(self, *args, **kwargs):
        # Calculate Grand Total just in case
        self.grand_total = float(self.total_price) + float(self.shipping_cost) - float(self.voucher_nominal)
        if self.grand_total < 0:
            self.grand_total = 0

        if not self.pk:
            super().save(*args, **kwargs)
        
        if not self.order_number:
            self.order_number = f"ORD-{self.user.id:03d}-{self.id:04d}"
            kwargs['force_insert'] = False
            super().save(*args, **kwargs)

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