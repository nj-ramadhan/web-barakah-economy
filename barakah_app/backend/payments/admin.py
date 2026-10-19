from django.contrib import admin
from .models import PaymentSetting, ModulePaymentSetting, ListenerDevice

@admin.register(PaymentSetting)
class PaymentSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'active_mode', 'bank_name', 'account_number', 'account_name', 'android_webhook_enabled', 'updated_at')

@admin.register(ModulePaymentSetting)
class ModulePaymentSettingAdmin(admin.ModelAdmin):
    list_display = ('module_code', 'module_title', 'is_custom', 'payment_mode', 'bank_name', 'account_number', 'updated_at')
    list_filter = ('is_custom', 'payment_mode')
    search_fields = ('module_code', 'module_title', 'bank_name', 'account_number')

@admin.register(ListenerDevice)
class ListenerDeviceAdmin(admin.ModelAdmin):
    list_display = ('device_name', 'device_id', 'is_active', 'last_heartbeat', 'last_ip', 'last_notification_at')
    list_filter = ('is_active',)
    search_fields = ('device_name', 'device_id', 'last_ip')
