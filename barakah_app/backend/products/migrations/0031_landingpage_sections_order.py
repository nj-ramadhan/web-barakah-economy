# Generated for Landing Page Builder Drag & Drop sections

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0030_landingpage_expires_at_landingpage_is_published_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='landingpage',
            name='sections_order',
            field=models.JSONField(blank=True, default=list, help_text='Urutan blok komponen landing page (drag & drop)'),
        ),
    ]
