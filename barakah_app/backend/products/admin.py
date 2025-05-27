from django.contrib import admin
from .models import Product, Testimoni
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

class TestimoniAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Testimoni
        fields = '__all__'

class TestimoniAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'created_at')
    list_filter = ('product',)
    search_fields = ('customer', 'description') 
    form = ProductAdminForm    


admin.site.register(Product, ProductAdmin)
admin.site.register(Testimoni, TestimoniAdmin) 