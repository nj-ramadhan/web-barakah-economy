# carts/admin.py
from django.contrib import admin
from .models import Cart

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'quantity', 'created_at')
    list_filter = ('user', 'product', 'created_at')
    search_fields = ('user', 'product', )
    date_hierarchy = 'created_at'  # Add a date filter for the deadline