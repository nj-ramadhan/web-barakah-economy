from django.contrib import admin
from .models import (
    Event, EventFormField, EventRegistration, 
    EventSpeaker, EventSession, EventAttendance,
    EventRegistrationFile, EventDocumentationImage, EventCertificate
)

class EventFormFieldInline(admin.TabularInline):
    model = EventFormField
    extra = 1

class EventSpeakerInline(admin.TabularInline):
    model = EventSpeaker
    extra = 1

class EventSessionInline(admin.TabularInline):
    model = EventSession
    extra = 1

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_date', 'status', 'visibility', 'visible_at', 'registration_start_at', 'created_by')
    list_filter = ('status', 'visibility', 'is_featured', 'category')
    search_fields = ('title', 'description', 'location')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [EventFormFieldInline, EventSpeakerInline, EventSessionInline]
    
    fieldsets = (
        ('Informasi Dasar', {
            'fields': ('title', 'slug', 'category', 'short_description', 'description', 'status', 'visibility', 'is_featured')
        }),
        ('Waktu & Visibilitas', {
            'fields': ('start_date', 'end_date', 'visible_at', 'registration_start_at')
        }),
        ('Lokasi & Kapasitas', {
            'fields': ('location', 'location_url', 'capacity')
        }),
        ('Biaya & Kontak', {
            'fields': ('price_type', 'price_fixed', 'organizer_name', 'organizer_contact', 'has_certificate')
        }),
        ('Media & Berkas', {
            'fields': ('header_image', 'thumbnail', 'attachment_file', 'attachment_file_title', 'attachment_link', 'attachment_link_title', 'documentation_link')
        }),
    )

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'user', 'guest_name', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'event')
    search_fields = ('guest_name', 'guest_email', 'unique_code')
    readonly_fields = ('unique_code', 'qr_image')

@admin.register(EventAttendance)
class EventAttendanceAdmin(admin.ModelAdmin):
    list_display = ('registration', 'session', 'attended_at', 'scanned_by')
    list_filter = ('session', 'attended_at')

admin.site.register(EventRegistrationFile)
admin.site.register(EventDocumentationImage)
admin.site.register(EventCertificate)
