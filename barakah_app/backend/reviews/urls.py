# reviews/urls.py
from django.urls import path
from .views import ReviewListView, ReviewDetailView

urlpatterns = [
    path('products/<int:product_id>/reviews/', ReviewListView.as_view(), name='review-list'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
]