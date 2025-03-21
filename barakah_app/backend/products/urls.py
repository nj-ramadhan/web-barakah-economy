from django.urls import path
from .views import ProductViewSet, ProductDetailView

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

urlpatterns = [
    path('', product_list, name='product-list'),  # List dan create
    path('<int:pk>/', product_detail, name='product-detail-id'),  # Detail berdasarkan ID
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail-slug'),  # Detail berdasarkan slug
]