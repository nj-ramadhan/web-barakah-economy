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
        try:
            if obj.seller and hasattr(obj.seller, 'profile'):
                profile = obj.seller.profile
                if profile:
                    return profile.address_city_id or '153'
            return '153' # Default (Jakarta Selatan)
        except Exception:
            return '153'

class ShopVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopVoucher
        fields = '__all__'
        read_only_fields = ['seller']
