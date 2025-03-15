# wishlists/admin.py
from django.contrib import admin
from .models import Wishlist

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'created_at')
    list_filter = ('user', 'product', 'created_at')
    search_fields = ('user', 'product', )
    date_hierarchy = 'created_at'  # Add a date filter for the deadline