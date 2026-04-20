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
        fields = ['id', 'sku', 'name', 'additional_price', 'discount', 'stock', 'is_active']

class ProductSerializer(serializers.ModelSerializer):
    testimonies = TestimoniSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variations = ProductVariationSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_city_id = serializers.SerializerMethodField()
    seller_city_name = serializers.CharField(source='seller.profile.address_city_name', read_only=True)
    seller_village_id = serializers.CharField(source='seller.profile.address_village_id', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

    def get_seller_city_id(self, obj):
        try:
            if obj.seller and hasattr(obj.seller, 'profile'):
                profile = obj.seller.profile
                if profile:
                    # Priority given to 10-digit Village ID
                    v_id = profile.address_village_id
                    if v_id and len(str(v_id)) == 10:
                        return str(v_id)
            # Default to Barakah Warehouse (Desa Lambangjaya) if seller profile is incomplete
            return '3216061005' 
        except Exception:
            return '3216061005'

class ShopVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopVoucher
        fields = '__all__'
        read_only_fields = ['seller']
