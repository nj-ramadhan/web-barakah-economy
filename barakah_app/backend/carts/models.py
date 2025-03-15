# carts/models.py
from django.db import models
from accounts.models import User  # Assuming you have a custom User model
from products.models import Product  # Assuming you have a Product model

class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s cart - {self.product.title}"

    def total_price(self):
        return self.product.price * self.quantity