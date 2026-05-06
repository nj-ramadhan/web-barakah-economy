# digital_products/serializers.py
from rest_framework import serializers
from .models import DigitalProduct, DigitalOrder


class DigitalProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = DigitalProduct
        fields = [
            'id', 'user', 'seller_name', 'title', 'slug', 'description',
            'category', 'visibility', 'thumbnail', 'price', 'digital_link',
            'is_active', 'view_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'user', 'created_at', 'updated_at']


class DigitalProductPublicSerializer(serializers.ModelSerializer):
    """Public serializer — hides digital_link from non-owners"""
    seller_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = DigitalProduct
        fields = [
            'id', 'user', 'seller_name', 'title', 'slug', 'description',
            'category', 'visibility', 'thumbnail', 'price',
            'is_active', 'view_count', 'created_at',
        ]


class DigitalOrderSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='digital_product.title', read_only=True)

    class Meta:
        model = DigitalOrder
        fields = [
            'id', 'order_number', 'digital_product', 'product_title',
            'product_owner', 'buyer', 'buyer_name', 'buyer_email', 'buyer_phone',
            'amount', 'payment_proof', 'payment_status',
            'ocr_verified', 'email_sent', 'created_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'payment_status',
            'ocr_verified', 'email_sent', 'created_at',
        ]


class DigitalOrderCreateSerializer(serializers.ModelSerializer):
    """For creating orders — no auth required"""
    class Meta:
        model = DigitalOrder
        fields = [
            'digital_product', 'buyer_name', 'buyer_email',
            'buyer_phone', 'amount',
        ]


from .models import WithdrawalRequest

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'user', 'user_username', 'amount', 'donation_amount',
            'admin_fee', 'total_deduction', 'account_name',
            'account_number', 'bank_name', 'status', 'transfer_proof',
            'rejection_reason', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_username', 'status', 'transfer_proof', 
            'rejection_reason', 'admin_fee', 'total_deduction', 'created_at'
        ]


class WithdrawalRequestAdminSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'user', 'user_username', 'amount', 'donation_amount',
            'admin_fee', 'total_deduction', 'account_name',
            'account_number', 'bank_name', 'status', 'transfer_proof',
            'rejection_reason', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_username', 'amount', 'donation_amount',
            'admin_fee', 'total_deduction', 'account_name',
            'account_number', 'bank_name', 'created_at'
        ]


class UnifiedTransactionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order_number = serializers.CharField()
    type = serializers.CharField()  # 'digital' or 'course'
    product_title = serializers.CharField()
    buyer_name = serializers.CharField()
    buyer_email = serializers.EmailField()
    buyer_phone = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_status = serializers.CharField()
    created_at = serializers.DateTimeField()
    seller_name = serializers.CharField()
