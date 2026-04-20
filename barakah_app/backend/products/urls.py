from django.urls import path
from .views import ProductViewSet, ProductDetailView, ProductShareView, ShopVoucherViewSet, VoucherValidateView

# Endpoint untuk list dan create product
product_list = ProductViewSet.as_view({
    'get': 'list',
    'post': 'create',
})

# Endpoint untuk retrieve, update, dan delete product berdasarkan ID
product_detail = ProductViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

voucher_list = ShopVoucherViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
voucher_detail = ShopVoucherViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    path('vouchers/', voucher_list, name='voucher-list'),
    path('vouchers/<int:pk>/', voucher_detail, name='voucher-detail'),
    path('vouchers/validate/', VoucherValidateView.as_view(), name='voucher-validate'),
    path('', product_list, name='product-list'),  # List dan create
    path('<int:pk>/', product_detail, name='product-detail-id'),  # Detail berdasarkan ID
    path('share/<slug:slug>/', ProductShareView.as_view(), name='product-share-slug'),  # Share preview endpoint
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail-slug'),  # Detail berdasarkan slug
]