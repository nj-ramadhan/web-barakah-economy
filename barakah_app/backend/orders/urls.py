from django.urls import path
from .views import CreateOrderView, OrderListView, OrderDetailView, SellerOrderViewSet, UnreviewedProductsView

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('seller-orders', SellerOrderViewSet, basename='seller-orders')

urlpatterns = [
    path('', CreateOrderView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('create-order/', CreateOrderView.as_view(), name='create-order'),
    path('unreviewed-products/', UnreviewedProductsView.as_view(), name='unreviewed-products'),
] + router.urls