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

    # Action endpoints for ID
    path('<int:pk>/like/', ProductViewSet.as_view({'post': 'like'}), name='product-like'),
    path('<int:pk>/add_testimoni_admin/', ProductViewSet.as_view({'post': 'add_testimoni_admin'}), name='product-testi-admin-id'),
    path('<int:pk>/add_testimoni_buyer/', ProductViewSet.as_view({'post': 'add_testimoni_buyer'}), name='product-testi-buyer-id'),
    path('<int:pk>/testimonies/<int:testimoni_id>/', ProductViewSet.as_view({'delete': 'delete_testimoni'}), name='product-testi-delete-id'),
    path('<int:pk>/promotion/', ProductViewSet.as_view({'get': 'promotion', 'post': 'promotion', 'delete': 'promotion'}), name='product-promotion-id'),
    path('<int:pk>/', product_detail, name='product-detail-id'),  # Detail berdasarkan ID

    # Action endpoints for Slug
    path('<slug:slug>/like/', ProductViewSet.as_view({'post': 'like'}), name='product-like-slug'),
    path('<slug:slug>/add_testimoni_admin/', ProductViewSet.as_view({'post': 'add_testimoni_admin'}), name='product-testi-admin-slug'),
    path('<slug:slug>/add_testimoni_buyer/', ProductViewSet.as_view({'post': 'add_testimoni_buyer'}), name='product-testi-buyer-slug'),
    path('<slug:slug>/testimonies/<int:testimoni_id>/', ProductViewSet.as_view({'delete': 'delete_testimoni'}), name='product-testi-delete-slug'),
    path('<slug:slug>/promotion/', ProductViewSet.as_view({'get': 'promotion', 'post': 'promotion', 'delete': 'promotion'}), name='product-promotion-slug'),
    path('share/<slug:slug>/', ProductShareView.as_view(), name='product-share-slug'),  # Share preview endpoint
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail-slug'),  # Detail berdasarkan slug
]