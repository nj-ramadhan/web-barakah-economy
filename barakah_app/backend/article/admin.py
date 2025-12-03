from django.contrib import admin
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget  # Import Widget CKEditor
from .models import Article, ArticleImage


# 1. Kita buat Form khusus untuk memaksa tampilan Widget
class ArticleAdminForm(forms.ModelForm):
    # Paksa kolom content menggunakan CKEditorUploadingWidget
    content = forms.CharField(widget=CKEditorUploadingWidget())

    class Meta:
        model = Article
        fields = '__all__'


# Inline Image (tetap sama)
class ArticleImageInline(admin.TabularInline):
    model = ArticleImage
    extra = 1


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    # 2. Masukkan form yang tadi kita buat ke sini
    form = ArticleAdminForm

    list_display = ('id', 'title', 'status_label', 'date')
    search_fields = ('title', 'content')
    list_filter = ('status', 'date')
    inlines = [ArticleImageInline]

    def status_label(self, obj):
        return obj.get_status_display()

    status_label.short_description = 'Status'