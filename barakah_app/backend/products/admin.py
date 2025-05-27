from django.contrib import admin
from .models import Product
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django import forms

class ProductAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Product
        fields = '__all__'

class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_active', 'price')
    list_filter = ('category', 'is_featured', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'created_at'  # Add a date filter for the deadline    
    form = ProductAdminForm    

admin.site.register(Product, ProductAdmin)