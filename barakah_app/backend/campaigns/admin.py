from django.contrib import admin
from .models import Campaign, Update
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django import forms

class CampaignAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Campaign
        fields = '__all__'

class CampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_active', 'deadline', 'has_unlimited_deadline', 'is_expired')
    list_filter = ('category', 'is_featured', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'deadline'  # Add a date filter for the deadline    
    form = CampaignAdminForm    

class UpdateAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Update
        fields = '__all__'

class UpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'campaign', 'created_at')
    list_filter = ('campaign',)
    search_fields = ('title', 'description') 
    form = CampaignAdminForm    

admin.site.register(Campaign, CampaignAdmin)
admin.site.register(Update, UpdateAdmin)     
