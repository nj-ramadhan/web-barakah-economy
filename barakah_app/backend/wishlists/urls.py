# wishlists/urls.py
from django.urls import path
from .views import WishlistView

urlpatterns = [
    path('wishlist/', WishlistView.as_view(), name='wishlist'),
]