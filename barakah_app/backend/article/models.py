from django.db import models
from ckeditor_uploader.fields import RichTextUploadingField  # Library Word Editor


class Article(models.Model):
    STATUS_CHOICES = (
        (1, 'Active'),
        (2, 'Not Active'),
    )

    title = models.TextField()

    content = RichTextUploadingField()

    status = models.IntegerField(choices=STATUS_CHOICES, default=1)
    date = models.DateField()

    class Meta:
        db_table = 'article'

    def __str__(self):
        return str(self.title)


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