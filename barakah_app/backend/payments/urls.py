# payments/urls.py
from django.urls import path
from .views import GenerateMidtransTokenView, MidtransNotificationView, UpdatePaymentStatusView

urlpatterns = [
    path('generate-midtrans-token/', GenerateMidtransTokenView.as_view(), name='generate-midtrans-token'),
    path('midtrans-notification/', MidtransNotificationView.as_view(), name='midtrans-notification'),
    path('update-payment-status/', UpdatePaymentStatusView.as_view(), name='update-payment-status'),
]