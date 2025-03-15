# shippings/urls.py
from django.urls import path
from .views import ShippingAddressListView, ShippingAddressDetailView

urlpatterns = [
    path('shipping-addresses/', ShippingAddressListView.as_view(), name='shipping-address-list'),
    path('shipping-addresses/<int:pk>/', ShippingAddressDetailView.as_view(), name='shipping-address-detail'),
]