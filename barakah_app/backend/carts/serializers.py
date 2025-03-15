# carts/serializers.py
from rest_framework import serializers
from .models import Cart
from products.serializers import ProductSerializer  # Assuming you have a Product serializer

class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'product', 'quantity', 'created_at', 'updated_at']