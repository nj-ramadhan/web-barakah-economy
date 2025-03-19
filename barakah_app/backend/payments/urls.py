# payments/urls.py
from django.urls import path
from .views import GenerateMidtransTokenView, MidtransNotificationView, CheckPaymentStatusView

urlpatterns = [
    path('generate-midtrans-token/', GenerateMidtransTokenView.as_view(), name='generate-midtrans-token'),
    path('midtrans-notification/', MidtransNotificationView.as_view(), name='midtrans-notification'),
    path('check-payment-status/', CheckPaymentStatusView.as_view(), name='check-payment-status'),
]