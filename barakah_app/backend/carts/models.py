# carts/models.py
from django.db import models
from accounts.models import User  # Assuming you have a custom User model
from products.models import Product, ProductVariation

class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='carts')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variation = models.ForeignKey(ProductVariation, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    is_selected = models.BooleanField(default=True, help_text="Checked in cart for checkout")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        var_text = f" ({self.variation.name})" if self.variation else ""
        return f"{self.user.username}'s cart - {self.product.title}{var_text}"

    def total_price(self):
        base_price = self.product.price
        if self.variation and self.variation.additional_price:
            base_price += self.variation.additional_price
        return base_price * self.quantity