# orders/models.py
from django.db import models
from accounts.models import User
from products.models import Product

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default='Pending')  # e.g., Pending, Shipped, Delivered
    order_number = models.CharField(max_length=20, unique=True, blank=True)

    def save(self, *args, **kwargs):
        # Check if the object is being saved for the first time
        if not self.pk:  # `pk` is None if the object is not yet saved
            super().save(*args, **kwargs)  # Save the object to generate the `id`
        
        # Generate the order number if it doesn't exist
        if not self.order_number:
            self.order_number = f"ORD-{self.user.id:03d}-{self.id:04d}"  # Example: ORD-123-0001
            kwargs['force_insert'] = False  # Ensure the update is not treated as an insert
            super().save(*args, **kwargs)  # Save again to update the `order_number`

    def __str__(self):
        return f"Order {self.order_number} by {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} in Order {self.order.id}"