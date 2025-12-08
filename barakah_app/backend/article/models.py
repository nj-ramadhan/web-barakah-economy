from django.db import models
from django.utils.text import slugify
from ckeditor_uploader.fields import RichTextUploadingField


class Article(models.Model):
    STATUS_CHOICES = (
        (1, 'Active'),
        (2, 'Not Active'),
    )

    title = models.TextField()

    # 1. SLUG (Untuk URL Artikel yang cantik)
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    content = RichTextUploadingField()

    # 2. CUSTOM FLOATING BUBBLE FIELDS
    floating_url = models.URLField(
        blank=True, null=True,
        help_text="Link tujuan saat bubble diklik (misal: https://wa.me/...)"
    )
    floating_label = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Teks pada tombol (misal: 'Beli Sekarang'). Default: Pesan Kalender"
    )
    floating_icon = models.ImageField(
        upload_to='bubble_icons/', blank=True, null=True,
        help_text="Icon kecil di tombol bubble. Jika kosong, pakai icon default."
    )

    status = models.IntegerField(choices=STATUS_CHOICES, default=1)
    date = models.DateField()

    class Meta:
        db_table = 'article'

    def __str__(self):
        return str(self.title)

    # Logic Save: Auto-generate slug dari title jika kosong
    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            original_slug = slugify(self.title)
            unique_slug = original_slug
            num = 1
            while Article.objects.filter(slug=unique_slug).exists():
                unique_slug = '{}-{}'.format(original_slug, num)
                num += 1
            self.slug = unique_slug
        super(Article, self).save(*args, **kwargs)


class ArticleImage(models.Model):
    title = models.TextField(blank=True, null=True)
    path = models.ImageField(upload_to='articles/', db_column='path')
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="images",
        db_column="id_article"
    )

    class Meta:
        db_table = 'article_img'