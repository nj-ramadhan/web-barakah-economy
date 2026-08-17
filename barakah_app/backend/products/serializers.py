from rest_framework import serializers
from django.utils import timezone
from .models import Product, Testimoni, ProductImage, ProductVariation, ShopVoucher, ProductPromotion

class TestimoniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimoni
        fields = ['id', 'customer', 'stars', 'description', 'image', 'is_admin_entry', 'created_at', 'user']   

class ProductPromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPromotion
        fields = '__all__'

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
    promotions = ProductPromotionSerializer(many=True, read_only=True)
    active_promotion = serializers.SerializerMethodField()
    discounted_price = serializers.SerializerMethodField()
    promo_discount_percentage = serializers.SerializerMethodField()

    seller_name = serializers.CharField(source='seller.username', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    seller_city_id = serializers.SerializerMethodField()
    seller_city_name = serializers.CharField(source='seller.profile.address_city_name', read_only=True)
    seller_village_id = serializers.CharField(source='seller.profile.address_village_id', read_only=True)
    seller_avatar = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_active_promotion(self, obj):
        now = timezone.now()
        promo = obj.promotions.filter(is_active=True, start_date__lte=now, end_date__gte=now).first()
        if promo:
            return ProductPromotionSerializer(promo).data
        return None

    def get_discounted_price(self, obj):
        now = timezone.now()
        promo = obj.promotions.filter(is_active=True, start_date__lte=now, end_date__gte=now).first()
        if not promo:
            return None
        price = float(obj.price)
        if promo.discount_type == 'percentage':
            discount_amount = price * (float(promo.discount_value) / 100.0)
            return max(0, price - discount_amount)
        elif promo.discount_type == 'nominal':
            return max(0, price - float(promo.discount_value))
        elif promo.discount_type == 'min_qty_discount' and promo.min_quantity <= 1:
            if promo.is_min_qty_percentage:
                discount_amount = price * (float(promo.discount_value) / 100.0)
                return max(0, price - discount_amount)
            else:
                return max(0, price - float(promo.discount_value))
        return None

    def get_promo_discount_percentage(self, obj):
        now = timezone.now()
        promo = obj.promotions.filter(is_active=True, start_date__lte=now, end_date__gte=now).first()
        if not promo:
            return None
        if promo.discount_type == 'percentage':
            return int(promo.discount_value)
        elif promo.discount_type == 'nominal' and obj.price > 0:
            pct = (float(promo.discount_value) / float(obj.price)) * 100.0
            return int(round(pct))
        return None

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
            return '3216062003' 
        except Exception:
            return '3216062003'

    def get_seller_avatar(self, obj):
        if obj.seller and hasattr(obj.seller, 'profile'):
            profile = obj.seller.profile
            if profile.picture:
                return profile.picture.url
            if profile.google_picture_url:
                return profile.google_picture_url
        return None

    def get_min_price(self, obj):
        variations = obj.variations.filter(is_active=True)
        if not variations.exists():
            return obj.price
        prices = [v.additional_price if v.additional_price > 0 else obj.price for v in variations]
        return min(prices) if prices else obj.price

    def get_max_price(self, obj):
        variations = obj.variations.filter(is_active=True)
        if not variations.exists():
            return obj.price
        prices = [v.additional_price if v.additional_price > 0 else obj.price for v in variations]
        return max(prices) if prices else obj.price

    def get_total_stock(self, obj):
        variations = obj.variations.filter(is_active=True)
        if not variations.exists():
            return obj.stock
        return sum(v.stock for v in variations)

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

class ShopVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopVoucher
        fields = '__all__'
        read_only_fields = ['seller']
