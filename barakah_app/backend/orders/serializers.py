# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderItem
from profiles.models import Profile

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.title', read_only=True)
    variation_name = serializers.CharField(source='variation.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'variation', 'variation_name', 'quantity', 'price']

class BuyerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = Profile
        fields = ['username', 'name_full', 'phone', 'address', 'address_city_name', 'address_province', 'address_postal_code']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    buyer_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'user', 'buyer_details', 'seller', 'seller_name', 'created_at', 'updated_at', 
                  'total_price', 'shipping_cost', 'shipping_courier', 'shipping_service', 
                  'voucher_code', 'voucher_nominal', 'grand_total', 'status', 'resi_number', 'payment_proof', 'items', 'qris_payload']



    def get_buyer_details(self, obj):
        try:
            profile = Profile.objects.get(user=obj.user)
            return BuyerProfileSerializer(profile).data
        except Exception:
            return {'username': obj.user.username}