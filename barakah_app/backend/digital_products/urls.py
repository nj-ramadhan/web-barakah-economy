# digital_products/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DigitalProductViewSet, DigitalOrderViewSet

router = DefaultRouter()
router.register(r'products', DigitalProductViewSet, basename='digital-product')
router.register(r'orders', DigitalOrderViewSet, basename='digital-order')

urlpatterns = [
    path('', include(router.urls)),
]
