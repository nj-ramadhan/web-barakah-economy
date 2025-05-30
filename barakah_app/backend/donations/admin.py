# donations/admin.py
from django.contrib import admin
from .models import Donation

class DonationAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'donor', 'donor_name', 'donor_phone','amount', 'payment_status', 'transfer_date')
    list_filter = ('campaign', 'payment_method', 'payment_status')
    search_fields = ('donor_name', )
    date_hierarchy = 'transfer_date'  # Add a date filter for the deadline

    # Define a custom admin action
    actions = ['verify_selected_donations']

    def verify_selected_donations(self, request, queryset):
        # Update the payment_status of the selected donations to "verified"
        queryset.update(payment_status='verified')
        self.message_user(request, f"{queryset.count()} donations have been verified.")

    verify_selected_donations.short_description = "Verify selected donations"

admin.site.register(Donation, DonationAdmin)   