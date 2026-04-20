from django.urls import path
from .views import (
    ShippingAddressListView, ShippingAddressDetailView, 
    ProvinceListView, CityListView, DistrictListView, VillageListView, ShippingCostAPIView, ExpeditionDiagnosticView
)

urlpatterns = [
    path('shipping-addresses/', ShippingAddressListView.as_view(), name='shipping-address-list'),
    path('shipping-addresses/<int:pk>/', ShippingAddressDetailView.as_view(), name='shipping-address-detail'),
    path('provinces/', ProvinceListView.as_view(), name='shipping-provinces'),
    path('cities/', CityListView.as_view(), name='shipping-cities'),
    path('districts/', DistrictListView.as_view(), name='shipping-districts'),
    path('villages/', VillageListView.as_view(), name='shipping-villages'),
    path('costs/', ShippingCostAPIView.as_view(), name='shipping-costs'),
    path('test-expedition/', ExpeditionDiagnosticView.as_view(), name='expedition-diagnostic'),
]