from django.contrib import admin
from .models import Course, CourseMaterial, CourseEnrollment
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

class CourseMaterialAdminForm(forms.ModelForm):
    content = forms.CharField(widget=CKEditorUploadingWidget())  # Use CKEditorWidget for the article field

    class Meta:
        model = CourseMaterial
        fields = '__all__'

class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'material_type')
    list_filter = ('course', 'material_type')
    search_fields = ('title', 'course')
    form = CourseMaterialAdminForm  

class CourseEnrollmentAdminForm(forms.ModelForm):
    class Meta:
        model = CourseEnrollment
        fields = '__all__'

class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('course', 'user', 'payment_status')
    list_filter = ('payment_status', 'course')
    search_fields = ('user', 'course')
    date_hierarchy = 'enrolled_at' 
    form = CourseEnrollmentAdminForm 

admin.site.register(Course, CourseAdmin)
admin.site.register(CourseMaterial, CourseMaterialAdmin)
admin.site.register(CourseEnrollment, CourseEnrollmentAdmin)
