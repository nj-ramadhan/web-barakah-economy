from django.contrib import admin
from .models import Partner, Testimonial, Activity, AboutUs, AboutUsLegalDocument

@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'order', 'created_at')
    list_filter = ('type',)
    search_fields = ('name',)

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'rating', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'rating')
    search_fields = ('name', 'user__username', 'content')

class AboutUsLegalDocumentInline(admin.TabularInline):
    model = AboutUsLegalDocument
    extra = 1

@admin.register(AboutUs)
class AboutUsAdmin(admin.ModelAdmin):
    list_display = ('title', 'updated_at')
    inlines = [AboutUsLegalDocumentInline]

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'created_at')
    search_fields = ('title', 'content')
