from django.contrib import admin
from django import forms
from ckeditor_uploader.widgets import CKEditorUploadingWidget
from .models import Article, ArticleImage


class ArticleAdminForm(forms.ModelForm):
    content = forms.CharField(widget=CKEditorUploadingWidget())

    class Meta:
        model = Article
        fields = '__all__'


class ArticleImageInline(admin.TabularInline):
    model = ArticleImage
    extra = 1


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    form = ArticleAdminForm

    # Tampilkan kolom custom bubble di list
    list_display = ('id', 'title', 'slug', 'floating_url', 'floating_label', 'date')
    search_fields = ('title', 'content')
    list_filter = ('status', 'date')
    inlines = [ArticleImageInline]

    # Auto-fill slug saat ngetik title
    prepopulated_fields = {'slug': ('title',)}