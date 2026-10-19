from django.contrib import admin
from .models import UserWallet, WalletTransaction, OutgoingFund

@admin.register(OutgoingFund)
class OutgoingFundAdmin(admin.ModelAdmin):
    list_display = ('title', 'fund_account', 'category', 'amount', 'status', 'transaction_date', 'recipient_name')
    list_filter = ('fund_account', 'category', 'status', 'transaction_date')
    search_fields = ('title', 'description', 'recipient_name', 'recipient_account')

@admin.register(UserWallet)
class UserWalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'updated_at')
    search_fields = ('user__username', 'user__email')

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'amount', 'balance_after', 'created_at')
    list_filter = ('transaction_type', 'created_at')
    search_fields = ('wallet__user__username', 'description')
