# wishlists/views.py
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Wishlist
from products.models import Product
from .serializers import WishlistSerializer
from rest_framework.permissions import IsAuthenticated

class WishlistView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure this is added

    def get(self, request):
        user = request.user
        wishlist_items = Wishlist.objects.filter(user=user)
        serializer = WishlistSerializer(wishlist_items, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        user = request.user
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)

        wishlist_item, created = Wishlist.objects.get_or_create(user=user, product=product)
        if created:
            serializer = WishlistSerializer(wishlist_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({'message': 'Produk sudah ada di incaran'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        product_id = request.data.get('product_id')
        wishlist_item = get_object_or_404(Wishlist, user=user, product_id=product_id)
        wishlist_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)