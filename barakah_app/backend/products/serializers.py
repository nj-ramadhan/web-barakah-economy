from rest_framework import serializers
from django.utils import timezone
from .models import (
    Product, Testimoni, ProductImage, ProductVariation, ShopVoucher, ProductPromotion, ServiceItem, ServicePaymentOrder,
    LandingPage, LandingPageSlotSetting, LandingPageQuota, LandingPageSlotOrder
)

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
    seller_show_sold_count = serializers.SerializerMethodField()

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

    def get_seller_show_sold_count(self, obj):
        try:
            if obj.seller and hasattr(obj.seller, 'profile'):
                return getattr(obj.seller.profile, 'show_sold_count', True)
        except Exception:
            pass
        return True

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


class ServicePaymentOrderSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source='service.title', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ServicePaymentOrder
        fields = [
            'id', 'order_number', 'user', 'username', 'service', 'service_title',
            'order_type', 'duration_days', 'base_amount', 'unique_code', 'amount',
            'payment_method', 'payment_status', 'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['order_number', 'user', 'unique_code', 'amount', 'payment_status', 'paid_at', 'created_at', 'updated_at']


class ServiceItemSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_full_name = serializers.SerializerMethodField()
    seller_shop_name = serializers.CharField(source='seller.profile.shop_name', read_only=True, default='')
    seller_avatar = serializers.SerializerMethodField()
    seller_city = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    effective_whatsapp = serializers.SerializerMethodField()

    is_expired = serializers.BooleanField(read_only=True)
    remaining_days = serializers.IntegerField(read_only=True)
    pending_payment_order = serializers.SerializerMethodField()

    class Meta:
        model = ServiceItem
        fields = [
            'id', 'seller', 'seller_name', 'seller_full_name', 'seller_shop_name', 'seller_avatar', 'seller_city',
            'title', 'slug', 'category', 'category_display', 'description', 'thumbnail',
            'price', 'price_rate', 'whatsapp_number', 'effective_whatsapp', 'whatsapp_message',
            'location_city', 'status', 'status_display', 'rejection_reason',
            'is_active', 'views_count', 'likes_count', 'is_liked',
            'expires_at', 'publish_payment_status', 'is_expired', 'remaining_days',
            'pending_payment_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['seller', 'slug', 'status', 'rejection_reason', 'views_count', 'expires_at', 'publish_payment_status', 'created_at', 'updated_at']

    def get_seller_full_name(self, obj):
        profile = getattr(obj.seller, 'profile', None)
        return getattr(profile, 'name_full', None) or obj.seller.username

    def get_seller_avatar(self, obj):
        request = self.context.get('request')
        profile = getattr(obj.seller, 'profile', None)
        if profile and profile.picture:
            try:
                return request.build_absolute_uri(profile.picture.url) if request else profile.picture.url
            except Exception:
                return str(profile.picture)
        if profile and profile.google_picture_url:
            return profile.google_picture_url
        return None

    def get_seller_city(self, obj):
        if obj.location_city:
            return obj.location_city
        profile = getattr(obj.seller, 'profile', None)
        return getattr(profile, 'address_city_name', None) or 'Indonesia'

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_effective_whatsapp(self, obj):
        if obj.whatsapp_number:
            return obj.whatsapp_number
        profile = getattr(obj.seller, 'profile', None)
        return getattr(profile, 'phone', None) or getattr(obj.seller, 'phone_number', '')

    def get_pending_payment_order(self, obj):
        order = obj.payment_orders.filter(payment_status='pending').order_by('-created_at').first()
        if order:
            return ServicePaymentOrderSerializer(order).data
        return None


# ==============================================================================
# LANDING PAGE SERIALIZERS
# ==============================================================================

class LandingPageSlotSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandingPageSlotSetting
        fields = [
            'id', 'price_per_slot', 'free_quota', 'free_duration_type',
            'default_free_days', 'subscription_price_monthly',
            'is_active', 'instructions', 'updated_at'
        ]


class LandingPageQuotaSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    free_quota = serializers.SerializerMethodField()
    price_per_slot = serializers.SerializerMethodField()
    subscription_price_monthly = serializers.SerializerMethodField()
    free_duration_type = serializers.SerializerMethodField()
    default_free_days = serializers.SerializerMethodField()
    total_allowed = serializers.ReadOnlyField()
    used_count = serializers.SerializerMethodField()
    can_create_more = serializers.SerializerMethodField()

    class Meta:
        model = LandingPageQuota
        fields = [
            'id', 'username', 'extra_slots', 'free_quota', 'price_per_slot',
            'subscription_price_monthly', 'free_duration_type', 'default_free_days',
            'total_allowed', 'used_count', 'can_create_more', 'updated_at'
        ]

    def get_free_quota(self, obj):
        return LandingPageSlotSetting.get_settings().free_quota

    def get_price_per_slot(self, obj):
        return LandingPageSlotSetting.get_settings().price_per_slot

    def get_subscription_price_monthly(self, obj):
        return LandingPageSlotSetting.get_settings().subscription_price_monthly

    def get_free_duration_type(self, obj):
        return LandingPageSlotSetting.get_settings().free_duration_type

    def get_default_free_days(self, obj):
        return LandingPageSlotSetting.get_settings().default_free_days

    def get_used_count(self, obj):
        return LandingPage.objects.filter(seller=obj.user).count()

    def get_can_create_more(self, obj):
        used = LandingPage.objects.filter(seller=obj.user).count()
        return used < obj.total_allowed


class LandingPageSlotOrderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_name = serializers.SerializerMethodField()
    landing_page_title = serializers.CharField(source='landing_page.title', read_only=True)

    class Meta:
        model = LandingPageSlotOrder
        fields = [
            'id', 'order_number', 'username', 'user_name', 'order_type',
            'landing_page', 'landing_page_title', 'duration_months', 'slots_count',
            'base_amount', 'unique_code', 'amount', 'payment_method',
            'payment_status', 'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'order_number', 'unique_code', 'amount', 'payment_status',
            'paid_at', 'created_at', 'updated_at'
        ]

    def get_user_name(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return getattr(profile, 'name_full', None) or obj.user.username


class LandingPageSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_avatar = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    theme_display = serializers.CharField(source='get_theme_display', read_only=True)
    layout_display = serializers.CharField(source='get_layout_display', read_only=True)
    font_family_display = serializers.CharField(source='get_font_family_display', read_only=True)
    is_expired = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = LandingPage
        fields = [
            'id', 'seller', 'seller_username', 'seller_name', 'seller_avatar',
            'title', 'slug', 'tagline', 'description',
            'logo', 'hero_image', 'hero_headline', 'hero_subheadline',
            'price', 'slash_price', 'badge_text',
            'cta_text', 'cta_subtext', 'cta_type', 'cta_link',
            'whatsapp_number', 'whatsapp_message',
            'secondary_cta_text', 'secondary_cta_link',
            'show_header_nav', 'header_title', 'header_tagline', 'header_cta_text', 'header_cta_link',
            'linked_product_type', 'linked_product_id', 'linked_product_data',
            'theme', 'theme_display', 'layout', 'layout_display',
            'font_family', 'font_family_display',
            'primary_color', 'secondary_color', 'background_color',
            'text_color', 'button_color', 'button_text_color',
            'carousel_images', 'features', 'testimonials', 'faq_items', 'paragraphs',
            'trust_badges', 'sections_order', 'section_styles',
            'views_count', 'is_active', 'is_published', 'published_at',
            'expires_at', 'is_expired', 'days_remaining',
            'created_at', 'updated_at', 'public_url'
        ]
        read_only_fields = ['seller', 'slug', 'views_count', 'published_at', 'created_at', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Fallback to linked_product_data if fields are stored inside JSON
        linked_data = getattr(instance, 'linked_product_data', {}) or {}
        if not ret.get('section_styles') and isinstance(linked_data, dict):
            ret['section_styles'] = linked_data.get('section_styles', {})
        if not ret.get('trust_badges') and isinstance(linked_data, dict):
            ret['trust_badges'] = linked_data.get('trust_badges', [])
        return ret

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        linked_type = attrs.get('linked_product_type')
        linked_id = attrs.get('linked_product_id')

        if linked_type and linked_id and user and user.is_authenticated:
            from products.models import Product, ServiceItem
            from digital_products.models import DigitalProduct
            from courses.models import Course

            is_owner = False
            if linked_type == 'store':
                is_owner = Product.objects.filter(id=linked_id, seller=user).exists()
            elif linked_type == 'digital':
                is_owner = DigitalProduct.objects.filter(id=linked_id, user=user).exists()
            elif linked_type == 'ecourse':
                is_owner = Course.objects.filter(id=linked_id, instructor=user).exists()
            elif linked_type == 'service':
                is_owner = ServiceItem.objects.filter(id=linked_id, seller=user).exists()

            if not is_owner:
                raise serializers.ValidationError({
                    'linked_product_id': 'Produk yang ditautkan harus milik akun Anda sendiri. Anda tidak dapat menautkan produk milik pengguna lain.'
                })

        import json
        for json_field in ['section_styles', 'trust_badges', 'features', 'testimonials', 'faq_items', 'paragraphs', 'sections_order', 'carousel_images', 'linked_product_data']:
            if json_field in attrs and isinstance(attrs[json_field], str):
                try:
                    attrs[json_field] = json.loads(attrs[json_field])
                except Exception:
                    pass

        # Dual backup into linked_product_data for section_styles & trust_badges
        linked_data = attrs.get('linked_product_data') or (self.instance.linked_product_data if self.instance else {})
        if isinstance(linked_data, dict):
            if 'section_styles' in attrs:
                linked_data['section_styles'] = attrs['section_styles']
            if 'trust_badges' in attrs:
                linked_data['trust_badges'] = attrs['trust_badges']
            attrs['linked_product_data'] = linked_data

        return super().validate(attrs)

    def get_seller_name(self, obj):
        profile = getattr(obj.seller, 'profile', None)
        return getattr(profile, 'name_full', None) or obj.seller.username

    def get_seller_avatar(self, obj):
        request = self.context.get('request')
        profile = getattr(obj.seller, 'profile', None)
        if profile and profile.picture:
            try:
                return request.build_absolute_uri(profile.picture.url) if request else profile.picture.url
            except Exception:
                return str(profile.picture)
        if profile and profile.google_picture_url:
            return profile.google_picture_url
        return None

    def get_public_url(self, obj):
        return f"/lp/{obj.slug}"



