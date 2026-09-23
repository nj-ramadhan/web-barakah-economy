from rest_framework import serializers
from .models import Order, OrderItem, StoreCourier
from profiles.models import Profile

class StoreCourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreCourier
        fields = ['id', 'seller', 'name', 'phone', 'created_at']
        read_only_fields = ['id', 'seller', 'created_at']

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.title', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    variation_name = serializers.CharField(source='variation.name', read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True)
    purchase_instructions = serializers.CharField(source='product.purchase_instructions', read_only=True)
    has_reviewed = serializers.SerializerMethodField(read_only=True)
    user_review = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_slug', 'product_image', 'variation', 'variation_name', 'quantity', 'price', 'purchase_instructions', 'has_reviewed', 'user_review']

    def get_product_image(self, obj):
        if obj.product and obj.product.thumbnail:
            # Construct full URL if needed, or just relative
            return obj.product.thumbnail.url
        return None

    def get_has_reviewed(self, obj):
        try:
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else getattr(obj.order, 'user', None)
            if not user or not obj.product:
                return False
            from products.models import Testimoni
            return Testimoni.objects.filter(product=obj.product, user=user).exclude(description='').exists()
        except Exception:
            return False

    def get_user_review(self, obj):
        try:
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else getattr(obj.order, 'user', None)
            if not user or not obj.product:
                return None
            from products.models import Testimoni
            testi = Testimoni.objects.filter(product=obj.product, user=user).exclude(description='').first()
            if not testi:
                return None
            return {
                'id': testi.id,
                'stars': testi.stars,
                'description': testi.description,
                'image': testi.image.url if testi.image else None,
                'edit_count': testi.edit_count,
                'can_edit_by_admin': testi.can_edit_by_admin,
                'can_edit': testi.can_edit,
                'created_at': testi.created_at,
                'updated_at': testi.updated_at
            }
        except Exception:
            return None

class BuyerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = Profile
        fields = ['username', 'name_full', 'phone', 'address', 'address_rt_rw', 'address_village_name', 'address_subdistrict_name', 'address_city_name', 'address_province', 'address_postal_code']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    seller_phone = serializers.CharField(source='seller.phone', read_only=True)
    buyer_details = serializers.SerializerMethodField(read_only=True)
    admin_fee = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'user', 'buyer_details', 'seller', 'seller_name', 'seller_phone', 'created_at', 'updated_at', 
                  'total_price', 'shipping_cost', 'shipping_courier', 'shipping_service', 'shipping_type', 'driver_name', 'driver_phone', 'estimated_delivery_days',
                  'delivery_date', 'delivery_time_slot', 'shipping_schedule_type', 'delivery_timing_choice', 'is_distance_based_shipping', 'cod_amount_to_pay',
                  'voucher_code', 'voucher_nominal', 'grand_total', 'admin_fee', 'used_balance', 'status', 'resi_number', 'payment_proof', 'items', 'qris_payload', 'buyer_note', 'payment_method',
                  'paid_to_seller_directly', 'seller_bank_name', 'seller_bank_account', 'seller_bank_holder', 'seller_qris_image',
                  'recipient_name', 'recipient_phone', 'shipping_address', 'shipping_rt_rw', 'shipping_village', 'shipping_district', 'shipping_city',
                  'shipping_province', 'shipping_postal_code', 'shipping_address_detail', 'shipping_coordinates',
                  'auto_complete_at', 'shipped_at', 'completed_at', 'complaint_reason', 'complaint_at',
                  'cancel_request_status', 'cancel_request_reason', 'cancel_requested_at', 'cancelled_at', 'cancelled_by']

    def get_admin_fee(self, obj):
        try:
            from decimal import Decimal
            if getattr(obj, 'admin_fee', None) is not None and Decimal(str(obj.admin_fee)) > Decimal('0'):
                return float(obj.admin_fee)
            base_calc = (obj.total_price or Decimal('0')) + (obj.shipping_cost or Decimal('0')) - (obj.voucher_nominal or Decimal('0'))
            if obj.grand_total and obj.grand_total > base_calc:
                return float(obj.grand_total - base_calc)
        except Exception:
            pass
        return 0.0

    def get_buyer_details(self, obj):
        try:
            profile = Profile.objects.get(user=obj.user)
            return BuyerProfileSerializer(profile).data
        except Exception:
            return {'username': obj.user.username}