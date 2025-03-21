# Orders/admin.py
from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('user', 'order_number', 'total_price', 'status', 'created_at')
    list_filter = ('user', 'status')
    search_fields = ('user', )
    date_hierarchy = 'created_at'  # Add a date filter for the deadline

    # Define a custom admin action
    actions = ['ship_selected_orders', 'deliver_selected_orders']

    def deliver_selected_orders(self, request, queryset):
        # Update the payment_status of the selected Orders to "delivered"
        queryset.update(status='Delivered')
        self.message_user(request, f"{queryset.count()} Orders have been delivered.")

    def ship_selected_orders(self, request, queryset):
        # Update the payment_status of the selected Orders to "shipped"
        queryset.update(status='Shipped')
        self.message_user(request, f"{queryset.count()} Orders have been shipped.")

    ship_selected_orders.short_description = "Ship Selected Orders"
    deliver_selected_orders.short_description = "Deliver Selected Orders"