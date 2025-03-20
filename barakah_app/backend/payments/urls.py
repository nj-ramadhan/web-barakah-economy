# payments/urls.py
from django.urls import path
from .views import GenerateDonationMidtransTokenView, MidtransDonationNotificationView, CheckDonationPaymentStatusView, GenerateOrderMidtransTokenView, MidtransOrderNotificationView, CheckOrderPaymentStatusView

urlpatterns = [
    path('generate-donation-midtrans-token/', GenerateDonationMidtransTokenView.as_view(), name='generate-donation-midtrans-token'),
    path('midtrans-donation-notification/', MidtransDonationNotificationView.as_view(), name='midtrans-donation-notification'),
    path('check-donation-payment-status/', CheckDonationPaymentStatusView.as_view(), name='check-donation-payment-status'),
    path('generate-order-midtrans-token/', GenerateOrderMidtransTokenView.as_view(), name='generate-order-midtrans-token'),
    path('midtrans-order-notification/', MidtransOrderNotificationView.as_view(), name='midtrans-order-notification'),
    path('check-order-payment-status/', CheckOrderPaymentStatusView.as_view(), name='check-order-payment-status'),    
]