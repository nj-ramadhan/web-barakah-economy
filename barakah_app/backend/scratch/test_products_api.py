import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from products.models import Product
from products.serializers import ProductSerializer

try:
    products = Product.objects.filter(status='approved', is_active=True)
    serializer = ProductSerializer(products, many=True)
    print(f"Count: {products.count()}")
    data = serializer.data
    print("Serialization successful")
    # print(data[:2])
except Exception as e:
    import traceback
    traceback.print_exc()
