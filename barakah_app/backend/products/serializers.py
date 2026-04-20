from rest_framework import serializers
from .models import Product, Testimoni, ProductImage, ProductVariation, ShopVoucher

class TestimoniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimoni
        fields = ['id', 'customer', 'stars', 'description', 'created_at']   

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary']

class ProductVariationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariation
        fields = ['id', 'sku', 'name', 'additional_price', 'stock', 'is_active']

class ProductSerializer(serializers.ModelSerializer):
    testimonies = TestimoniSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variations = ProductVariationSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_city_id = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_seller_city_id(self, obj):
        if obj.seller and hasattr(obj.seller, 'profile'):
            return obj.seller.profile.address_city_id or '153' # Default to 153 if empty
        return '153' # Default (Jakarta Selatan) if no profile

class ShopVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopVoucher
        fields = '__all__'
        read_only_fields = ['seller']
