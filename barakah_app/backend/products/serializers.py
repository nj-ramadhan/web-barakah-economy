from rest_framework import serializers
from django.utils import timezone
from .models import Product, Testimoni, ProductImage, ProductVariation, ShopVoucher, ProductPromotion

class TestimoniSerializer(serializers.ModelSerializer):
    can_edit = serializers.BooleanField(read_only=True)

    class Meta:
        model = Testimoni
        fields = ['id', 'customer', 'stars', 'description', 'image', 'is_admin_entry', 'edit_count', 'can_edit_by_admin', 'can_edit', 'created_at', 'updated_at', 'user']   

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
    seller_shop_name = serializers.CharField(source='seller.profile.shop_name', read_only=True, default='')
    seller_followers_count = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    seller_city_id = serializers.SerializerMethodField()
    seller_city_name = serializers.SerializerMethodField()
    seller_village_id = serializers.CharField(source='seller.profile.address_village_id', read_only=True)
    seller_avatar = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    sold_count = serializers.SerializerMethodField()
    store_sold_count = serializers.SerializerMethodField()
    charity_sold_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def to_internal_value(self, data):
        # Convert QueryDict to mutable dict if necessary
        if hasattr(data, '_mutable') and not data._mutable:
            data = data.copy()
        elif isinstance(data, dict):
            data = data.copy()
            
        nullable_ints = ['preorder_days_min', 'preorder_days_max', 'delivery_range_min', 'delivery_range_max']
        for field in nullable_ints:
            if field in data and data[field] in ('', 'null', 'undefined', None):
                data[field] = None
                
        if 'delivery_date' in data and data['delivery_date'] in ('', 'null', 'undefined', None):
            data['delivery_date'] = None

        if 'shipping_cost' in data and data['shipping_cost'] in ('', 'null', 'undefined', None):
            data['shipping_cost'] = 0

        if 'out_of_po_shipping_cost' in data and data['out_of_po_shipping_cost'] in ('', 'null', 'undefined', None):
            data['out_of_po_shipping_cost'] = 0
            
        for bool_field in ['use_store_operational_settings', 'is_operational_hours_active', 'is_preorder', 'is_delivery_schedule_active', 'is_shipping_cost_active', 'out_of_po_shipping_active', 'allow_delivery_timing_choice']:
            if bool_field in data:
                val = data[bool_field]
                if isinstance(val, str):
                    data[bool_field] = val.lower() in ('true', '1', 't')
                    
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # If product is set to follow global store operational settings (default True)
        if getattr(instance, 'use_store_operational_settings', True):
            seller = getattr(instance, 'seller', None)
            profile = getattr(seller, 'profile', None) if seller else None
            if profile:
                ret['is_operational_hours_active'] = profile.is_operational_hours_active
                ret['operational_hours'] = profile.operational_hours
                ret['is_preorder'] = profile.is_preorder
                ret['preorder_type'] = profile.preorder_type
                ret['preorder_days'] = profile.preorder_days
                ret['preorder_days_min'] = profile.preorder_days_min
                ret['preorder_days_max'] = profile.preorder_days_max
                ret['preorder_duration'] = profile.preorder_duration
                ret['is_delivery_schedule_active'] = profile.is_delivery_schedule_active
                ret['delivery_schedule_type'] = profile.delivery_schedule_type
                ret['delivery_range_min'] = profile.delivery_range_min
                ret['delivery_range_max'] = profile.delivery_range_max
                ret['delivery_days'] = profile.delivery_days
                ret['delivery_date'] = profile.delivery_date.isoformat() if profile.delivery_date else None
                ret['delivery_note'] = profile.delivery_note
                ret['out_of_po_shipping_active'] = profile.out_of_po_shipping_active
                ret['out_of_po_shipping_type'] = profile.out_of_po_shipping_type
                ret['out_of_po_shipping_cost'] = str(profile.out_of_po_shipping_cost)
                ret['allow_delivery_timing_choice'] = profile.allow_delivery_timing_choice
        return ret

    def get_seller_phone(self, obj):
        if obj.seller:
            profile = getattr(obj.seller, 'profile', None)
            return obj.seller.phone or (profile.phone if profile else None)
        return None


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

    def get_seller_city_name(self, obj):
        try:
            if obj.seller and hasattr(obj.seller, 'profile'):
                profile = obj.seller.profile
                if profile:
                    if profile.address_city_name:
                        return profile.address_city_name
                    if profile.address_subdistrict_name:
                        return f"Kec. {profile.address_subdistrict_name}"
                    if profile.address_province:
                        return profile.address_province
        except Exception:
            pass
        return None

    def get_seller_followers_count(self, obj):
        try:
            if obj.seller:
                return obj.seller.follower_relations.count()
        except Exception:
            pass
        return 0

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

    def get_store_sold_count(self, obj):
        return obj.store_sold_count

    def get_charity_sold_count(self, obj):
        return obj.charity_sold_count

    def get_sold_count(self, obj):
        return obj.sold_count

class ShopVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopVoucher
        fields = '__all__'
        read_only_fields = ['seller']
