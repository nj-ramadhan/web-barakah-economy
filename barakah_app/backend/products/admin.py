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
    list_display = ('title', 'category', 'is_featured', 'is_active', 'price', 'own_bank_status', 'own_bank_name')
    list_filter = ('category', 'is_featured', 'is_active', 'own_bank_status')
    search_fields = ('title', 'description', 'own_bank_holder', 'own_bank_account')
    date_hierarchy = 'created_at'  # Add a date filter for the deadline    
    form = ProductAdminForm    

class TestimoniAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Testimoni
        fields = '__all__'

class TestimoniAdmin(admin.ModelAdmin):
    list_display = ('customer', 'product', 'stars', 'edit_count', 'can_edit_by_admin', 'created_at', 'updated_at')
    list_filter = ('can_edit_by_admin', 'stars', 'is_admin_entry', 'product')
    search_fields = ('customer', 'description') 
    actions = ['reset_edit_permission']

    @admin.action(description="Buka / Reset Akses Edit Ulasan untuk Pembeli Terpilih")
    def reset_edit_permission(self, request, queryset):
        count = queryset.update(can_edit_by_admin=True, edit_count=0)
        self.message_user(request, f"Berhasil membuka akses edit untuk {count} testimoni pembeli terpilih.")


admin.site.register(Product, ProductAdmin)
admin.site.register(Testimoni, TestimoniAdmin) 