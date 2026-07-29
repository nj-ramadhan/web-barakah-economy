# payments/urls.py
from django.urls import path
from .views import (
    GenerateDonationMidtransTokenView,
    MidtransDonationNotificationView,
    CheckDonationPaymentStatusView,
    GenerateOrderMidtransTokenView,
    MidtransOrderNotificationView,
    CheckOrderPaymentStatusView,
    PaymentPublicConfigView,
    PaymentAdminSettingsView,
    TestDynaQRISConnectionView,
    GenerateDynaQRISView,
    CheckDynaQRISStatusView,
    AndroidNotificationWebhookView,
)

urlpatterns = [
    # Global Payment Configuration & Settings
    path('config/', PaymentPublicConfigView.as_view(), name='payment-public-config'),
    path('admin-settings/', PaymentAdminSettingsView.as_view(), name='payment-admin-settings'),
    path('dynaqris/test-connection/', TestDynaQRISConnectionView.as_view(), name='test-dynaqris-connection'),
    path('dynaqris/generate/', GenerateDynaQRISView.as_view(), name='generate-dynaqris'),
    path('dynaqris/check-status/', CheckDynaQRISStatusView.as_view(), name='check-dynaqris-status'),
    path('webhook/android-notification/', AndroidNotificationWebhookView.as_view(), name='android-notification-webhook'),

    # Midtrans URLs
    path('generate-donation-midtrans-token/', GenerateDonationMidtransTokenView.as_view(), name='generate-donation-midtrans-token'),
    path('midtrans-donation-notification/', MidtransDonationNotificationView.as_view(), name='midtrans-donation-notification'),
    path('check-donation-payment-status/', CheckDonationPaymentStatusView.as_view(), name='check-donation-payment-status'),
    path('generate-order-midtrans-token/', GenerateOrderMidtransTokenView.as_view(), name='generate-order-midtrans-token'),
    path('midtrans-order-notification/', MidtransOrderNotificationView.as_view(), name='midtrans-order-notification'),
    path('check-order-payment-status/', CheckOrderPaymentStatusView.as_view(), name='check-order-payment-status'),    
]