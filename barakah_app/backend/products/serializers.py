# products/serializers.py
from rest_framework import serializers
from .models import Product, Testimoni

class TestimoniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimoni
        fields = ['id', 'customer', 'stars', 'description', 'created_at']   

class ProductSerializer(serializers.ModelSerializer):
    testimonies = TestimoniSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
