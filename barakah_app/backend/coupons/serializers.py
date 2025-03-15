# coupons/serializers.py
from rest_framework import serializers
from .models import Coupon

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['code', 'discount', 'valid_from', 'valid_to', 'active']