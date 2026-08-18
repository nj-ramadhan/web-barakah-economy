# transactions/urls.py
from django.urls import path
from .views import UserWalletView, WalletTransactionHistoryView, AdminIncomingFundsView

urlpatterns = [
    path('wallet/', UserWalletView.as_view(), name='user-wallet'),
    path('history/', WalletTransactionHistoryView.as_view(), name='wallet-history'),
    path('admin/incoming-funds/', AdminIncomingFundsView.as_view(), name='admin-incoming-funds'),
]
