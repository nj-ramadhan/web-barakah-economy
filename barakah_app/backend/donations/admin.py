# donations/admin.py
from django.contrib import admin
from .models import Donation

@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'donor_name', 'donor_phone','amount', 'payment_method', 'payment_status', 'transfer_date')
    list_filter = ('campaign', 'payment_method', 'payment_status')
    search_fields = ('donor_name', )
    date_hierarchy = 'transfer_date'  # Add a date filter for the deadline