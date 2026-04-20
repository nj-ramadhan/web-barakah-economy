# shippings/urls.py
from django.urls import path
from .views import (
    ShippingAddressListView, ShippingAddressDetailView, 
    ProvinceListView, CityListView, DistrictListView, ShippingCostAPIView, TestPingAPIView
)



urlpatterns = [
    path('shipping-addresses/', ShippingAddressListView.as_view(), name='shipping-address-list'),
    path('shipping-addresses/<int:pk>/', ShippingAddressDetailView.as_view(), name='shipping-address-detail'),
    path('provinces/', ProvinceListView.as_view(), name='rajaongkir-provinces'),
    path('cities/', CityListView.as_view(), name='rajaongkir-cities'),
    path('districts/', DistrictListView.as_view(), name='rajaongkir-districts'),
    path('costs/', ShippingCostAPIView.as_view(), name='rajaongkir-costs'),
    path('test-ping/', TestPingAPIView.as_view(), name='rajaongkir-test-ping'),


]