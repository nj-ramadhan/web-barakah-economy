from django.contrib import admin
from .models import Course

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_active', 'price')
    list_filter = ('category', 'is_featured', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'created_at'  # Add a date filter for the deadline