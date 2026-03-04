# digital_products/apps.py
from django.apps import AppConfig


class DigitalProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'digital_products'
    verbose_name = 'Digital Products'
