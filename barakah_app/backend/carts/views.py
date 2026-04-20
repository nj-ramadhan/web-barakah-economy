# carts/views.py
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cart
from products.models import Product
from .serializers import CartSerializer
from rest_framework.permissions import IsAuthenticated

class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        cart_items = Cart.objects.filter(user=user)
        serializer = CartSerializer(cart_items, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        product_id = request.data.get('product_id')
        variation_id = request.data.get('variation_id')
        quantity = request.data.get('quantity', 1)
        product = get_object_or_404(Product, id=product_id)
        
        from products.models import ProductVariation
        
        # Check if product has variations and one wasn't selected
        if product.variations.exists() and not variation_id:
            return Response({'error': 'Silakan pilih variasi terlebih dahulu.'}, status=status.HTTP_400_BAD_REQUEST)

        variation = None
        if variation_id:
            variation = get_object_or_404(ProductVariation, id=variation_id, product=product)

        cart_item, created = Cart.objects.get_or_create(user=user, product=product, variation=variation)
        if not created:
            cart_item.quantity += int(quantity)
            cart_item.save()
        else:
            cart_item.quantity = int(quantity)
            cart_item.save()

        serializer = CartSerializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        """Update quantity of a cart item. If 0, delete it."""
        user = request.user
        cart_item_id = request.data.get('cart_item_id')
        new_quantity = request.data.get('quantity')
        
        if new_quantity is None:
            return Response({'error': 'Quantity required'}, status=status.HTTP_400_BAD_REQUEST)
            
        cart_item = get_object_or_404(Cart, user=user, id=cart_item_id)
        
        if int(new_quantity) <= 0:
            cart_item.delete()
            return Response({'message': 'Item dihapus dari keranjang'}, status=status.HTTP_200_OK)
        
        cart_item.quantity = int(new_quantity)
        cart_item.save()
        serializer = CartSerializer(cart_item)
        return Response(serializer.data)

    def delete(self, request):
        user = request.user
        cart_item_id = request.data.get('cart_item_id')
        if not cart_item_id:
            # Fallback for old clients
            product_id = request.data.get('product_id')
            cart_items = Cart.objects.filter(user=user, product_id=product_id)
            cart_items.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        cart_item = get_object_or_404(Cart, user=user, id=cart_item_id)
        cart_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)