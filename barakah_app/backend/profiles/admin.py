# profiles/admin.py
from django.contrib import admin
from .models import Profile, BusinessProfile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name_full', 'shop_thumbnail', 'gender', 'segment')
    list_filter = ('gender', 'marital_status', 'segment')
    search_fields = ('name_full', 'user__username', 'shop_description')
    date_hierarchy = 'birth_date'

@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'user', 'business_field', 'business_scale', 'is_website_display_approved', 'is_curated', 'created_at')
    list_filter = ('business_field', 'business_scale', 'business_status', 'is_website_display_approved', 'is_curated')
    search_fields = ('brand_name', 'full_name', 'user__username', 'description')
    readonly_fields = ('created_at', 'updated_at')