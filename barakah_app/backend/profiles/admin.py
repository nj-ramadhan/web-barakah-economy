# profiles/admin.py
from django.contrib import admin
from .models import Profile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name_full', 'shop_thumbnail', 'gender', 'segment')
    list_filter = ('gender', 'marital_status', 'segment')
    search_fields = ('name_full', 'user__username', 'shop_description')
    date_hierarchy = 'birth_date'