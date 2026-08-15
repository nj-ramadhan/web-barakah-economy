from django.db import migrations

def update_product_units(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    
    for product in Product.objects.all():
        title_lower = (product.title or '').lower()
        cat_lower = (product.category or '').lower()
        current_unit = (product.unit or '').lower()
        
        # Only adjust if unit is kg or empty or default
        if current_unit in ['kg', '', None]:
            if any(w in title_lower for w in ["qur'an", "quran", "buku", "kitab", "juz", "tafsir", "majalah", "komik", "hafazan", "cerita"]):
                product.unit = 'buku'
            elif any(w in title_lower for w in ["mineral", "le minerale", "aqua", "jus", "sirup", "madu", "minyak", "botol", "kecap", "saos"]):
                product.unit = 'botol'
            elif any(w in title_lower for w in ["sepatu", "sandal", "kaos kaki"]):
                product.unit = 'pasang'
            elif any(w in title_lower for w in ["beras", "gula", "terigu", "daging", "ayam", "sayur", "buah"]) or cat_lower in ['sembako', 'pertanian']:
                product.unit = 'kg'
            else:
                product.unit = 'pcs'
            
            product.save()

def reverse_update(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0016_alter_product_unit'),
    ]

    operations = [
        migrations.RunPython(update_product_units, reverse_update),
    ]
