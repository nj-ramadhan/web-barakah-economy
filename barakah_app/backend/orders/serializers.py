# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.title', read_only=True)
    variation_name = serializers.CharField(source='variation.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'variation', 'variation_name', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'user', 'seller', 'seller_name', 'created_at', 'updated_at', 
                  'total_price', 'shipping_cost', 'shipping_courier', 'shipping_service', 
                  'voucher_code', 'voucher_nominal', 'grand_total', 'status', 'items']