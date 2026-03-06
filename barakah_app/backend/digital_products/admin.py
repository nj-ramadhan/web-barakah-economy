# digital_products/admin.py
from django.contrib import admin
from .models import DigitalProduct, DigitalOrder, EmailSettings, WithdrawalRequest


@admin.register(DigitalProduct)
class DigitalProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'category', 'price', 'visibility', 'is_active', 'created_at']
    list_filter = ['visibility', 'category', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'user__username']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(DigitalOrder)
class DigitalOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'buyer_name', 'product_owner', 'digital_product', 'amount', 'payment_status', 'email_sent', 'created_at']
    list_filter = ['payment_status', 'email_sent', 'created_at']
    search_fields = ['order_number', 'buyer_name', 'buyer_email', 'product_owner__username']


@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = ['email_host_user', 'sender_name', 'email_host', 'email_port']
    fieldsets = (
        ('Server SMTP', {
            'fields': ('email_host', 'email_port', 'email_use_tls'),
        }),
        ('Akun Pengirim', {
            'fields': ('email_host_user', 'email_host_password', 'sender_name'),
            'description': (
                '<b>Cara mendapatkan App Password Gmail:</b><br>'
                '1. Buka <a href="https://myaccount.google.com/security" target="_blank">Google Account > Security</a><br>'
                '2. Aktifkan <b>2-Step Verification</b> jika belum<br>'
                '3. Klik <b>App Passwords</b><br>'
                '4. Buat App Password baru, pilih "Mail" dan "Other (Custom name)"<br>'
                '5. Copy password 16 karakter yang muncul, paste di field "App Password" di atas'
            ),
        }),
    )

    def has_add_permission(self, request):
        # Hanya boleh 1 instance
        if self.model.objects.count() >= 1:
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'donation_amount', 'admin_fee', 'total_deduction', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'account_name', 'account_number']
    readonly_fields = ['created_at', 'updated_at']
    
    actions = ['approve_withdrawals', 'reject_withdrawals']

    def approve_withdrawals(self, request, queryset):
        queryset.update(status='approved')
    approve_withdrawals.short_description = "Approve selected withdrawal requests"

    def reject_withdrawals(self, request, queryset):
        queryset.update(status='rejected')
    reject_withdrawals.short_description = "Reject selected withdrawal requests"
