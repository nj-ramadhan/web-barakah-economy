# carts/serializers.py
from rest_framework import serializers
from .models import Cart
from products.serializers import ProductSerializer, ProductVariationSerializer  # Assuming you have a Product serializer

class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    variation = ProductVariationSerializer(read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'product', 'variation', 'quantity', 'total_price', 'is_selected', 'created_at', 'updated_at']