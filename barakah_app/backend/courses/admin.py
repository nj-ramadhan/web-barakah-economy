from django.contrib import admin
from .models import Course, CourseMaterial, CourseEnrollment, UserCourseProgress, Certificate
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
    description = forms.CharField(widget=CKEditorUploadingWidget(), required=False)  # Use CKEditorWidget

    class Meta:
        model = CourseMaterial
        fields = '__all__'

class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'created_at')
    list_filter = ('course',)
    search_fields = ('title', 'course')
    form = CourseMaterialAdminForm  

class CourseEnrollmentAdminForm(forms.ModelForm):
    class Meta:
        model = CourseEnrollment
        fields = '__all__'

class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'course', 'user', 'payment_status', 'enrolled_at')
    list_filter = ('payment_status', 'course')
    search_fields = ('user__username', 'course__title')
    date_hierarchy = 'enrolled_at' 
    form = CourseEnrollmentAdminForm 

class UserCourseProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'material', 'is_completed', 'completed_at')
    list_filter = ('user', 'course', 'is_completed')

class CertificateAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'certificate_number', 'issued_at')
    search_fields = ('certificate_number', 'user__username', 'course__title')

admin.site.register(Course, CourseAdmin)
admin.site.register(CourseMaterial, CourseMaterialAdmin)
admin.site.register(CourseEnrollment, CourseEnrollmentAdmin)
admin.site.register(UserCourseProgress, UserCourseProgressAdmin)
admin.site.register(Certificate, CertificateAdmin)
