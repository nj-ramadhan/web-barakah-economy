from rest_framework import serializers
from .models import PaymentSetting

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
