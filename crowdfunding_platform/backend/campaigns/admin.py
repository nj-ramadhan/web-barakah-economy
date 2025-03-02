from django.contrib import admin
from .models import Campaign, Update

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_active', 'deadline', 'has_unlimited_deadline', 'is_expired')
    list_filter = ('category', 'is_featured', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'deadline'  # Add a date filter for the deadline

@admin.register(Update)
class UpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'campaign', 'created_at')
    list_filter = ('campaign',)
    search_fields = ('title', 'description')