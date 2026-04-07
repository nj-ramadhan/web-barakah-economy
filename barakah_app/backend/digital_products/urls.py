# digital_products/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import DigitalProductViewSet, DigitalOrderViewSet, WithdrawalViewSet, SellerShareView, DigitalProductShareView, AdminDigitalProductViewSet

router = SimpleRouter()
router.register(r'products', DigitalProductViewSet, basename='digital-product')
router.register(r'orders', DigitalOrderViewSet, basename='digital-order')
router.register(r'withdrawals', WithdrawalViewSet, basename='withdrawal')
router.register(r'admin-products', AdminDigitalProductViewSet, basename='admin-digital-product')

urlpatterns = [
    path('', include(router.urls)),
    path('share/seller/<str:username>/', SellerShareView.as_view(), name='seller-share'),
    path('share/<str:username>/<slug:slug>/', DigitalProductShareView.as_view(), name='product-share'),
]
