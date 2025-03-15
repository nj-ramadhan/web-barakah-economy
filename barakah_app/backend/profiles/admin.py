# profiless/admin.py
from django.contrib import admin
from .models import Profile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'id_m', 'picture','name_full', 'gender', 'marital_status', 'segment')
    list_filter = ('gender', 'marital_status', 'segment')
    search_fields = ('id_m', 'name_full')
    date_hierarchy = 'birth_date'  # Add a date filter for the deadline