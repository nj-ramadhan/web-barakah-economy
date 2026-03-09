from django.db import models
from accounts.models import User
from products.models import Product
from courses.models import Course

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    rating = models.PositiveIntegerField()  # e.g., 1 to 5
    comment = models.TextField()
    image = models.ImageField(upload_to='review_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.user.username} for {self.product.name}"