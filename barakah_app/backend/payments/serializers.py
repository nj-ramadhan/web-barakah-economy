from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import PaymentSetting, ModulePaymentSetting, ListenerDevice

class PaymentSettingSerializer(serializers.ModelSerializer):
    manual_qris_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSetting
        fields = [
            'id',
            'active_mode',
            'dynaqris_api_key',
            'dynaqris_qris_id',
            'payment_timeout_minutes',
            'enable_anti_spam',
            'bank_name',
            'account_number',
            'account_name',
            'manual_qris_image',
            'manual_qris_image_url',
            'android_webhook_enabled',
            'android_webhook_secret',
            'updated_at',
        ]

    def get_manual_qris_image_url(self, obj):
        request = self.context.get('request')
        if obj.manual_qris_image and hasattr(obj.manual_qris_image, 'url'):
            if request:
                return request.build_absolute_uri(obj.manual_qris_image.url)
            return obj.manual_qris_image.url
        return None


class ModulePaymentSettingSerializer(serializers.ModelSerializer):
    manual_qris_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ModulePaymentSetting
        fields = [
            'id',
            'module_code',
            'module_title',
            'is_custom',
            'payment_mode',
            'dynaqris_api_key',
            'dynaqris_qris_id',
            'bank_name',
            'account_number',
            'account_name',
            'manual_qris_image',
            'manual_qris_image_url',
            'notes',
            'created_at',
            'updated_at',
        ]

    def get_manual_qris_image_url(self, obj):
        request = self.context.get('request')
        if obj.manual_qris_image and hasattr(obj.manual_qris_image, 'url'):
            if request:
                return request.build_absolute_uri(obj.manual_qris_image.url)
            return obj.manual_qris_image.url
        return None


class ListenerDeviceSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = ListenerDevice
        fields = [
            'id',
            'device_id',
            'device_name',
            'is_active',
            'is_online',
            'last_heartbeat',
            'last_ip',
            'last_notification_at',
            'last_notification_preview',
            'assigned_modules',
            'created_at',
            'updated_at',
        ]

    def get_is_online(self, obj):
        if not obj.is_active or not obj.last_heartbeat:
            return False
        return (timezone.now() - obj.last_heartbeat) < timedelta(minutes=10)
