from django.contrib import admin
from .models import Course
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from django import forms

class CourseAdminForm(forms.ModelForm):
    description = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = Course
        fields = '__all__'

class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_featured', 'is_active', 'price')
    list_filter = ('category', 'is_featured', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'created_at' 
    form = CourseAdminForm  

admin.site.register(Course, CourseAdmin)