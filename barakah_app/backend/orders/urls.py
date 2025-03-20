# orders/urls.py
from django.urls import path
from .views import OrderView, OrderListView, OrderDetailView

urlpatterns = [
    path('order/', OrderView.as_view(), name='order'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
]