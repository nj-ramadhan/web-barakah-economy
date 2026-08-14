# transactions/urls.py
from django.urls import path
from .views import UserWalletView, WalletTransactionHistoryView

urlpatterns = [
    path('wallet/', UserWalletView.as_view(), name='user-wallet'),
    path('history/', WalletTransactionHistoryView.as_view(), name='wallet-history'),
]
