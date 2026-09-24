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
        """
        Update cart items:
        1. Bulk selection sync: { "selected_ids": [1, 2, ...] }
        2. Select all / deselect all: { "select_all": true / false }
        3. Store-level selection: { "seller_id": 1, "is_selected": true / false }
        4. Single item selection: { "cart_item_id": 1, "is_selected": true / false }
        5. Quantity update: { "cart_item_id": 1, "quantity": 2 }
        """
        user = request.user

        # 1. Bulk selected IDs sync
        if 'selected_ids' in request.data:
            selected_ids = request.data.get('selected_ids') or []
            if not isinstance(selected_ids, list):
                selected_ids = [selected_ids]
            Cart.objects.filter(user=user, id__in=selected_ids).update(is_selected=True)
            Cart.objects.filter(user=user).exclude(id__in=selected_ids).update(is_selected=False)
            cart_items = Cart.objects.filter(user=user).order_by('id')
            return Response(CartSerializer(cart_items, many=True).data)

        # 2. Select All / Deselect All
        if 'select_all' in request.data:
            select_all = bool(request.data.get('select_all'))
            Cart.objects.filter(user=user).update(is_selected=select_all)
            cart_items = Cart.objects.filter(user=user).order_by('id')
            return Response(CartSerializer(cart_items, many=True).data)

        # 3. Store level selection toggle
        if 'seller_id' in request.data and 'is_selected' in request.data:
            seller_id = request.data.get('seller_id')
            is_selected = bool(request.data.get('is_selected'))
            if str(seller_id) in ('0', '', 'null', 'admin'):
                Cart.objects.filter(user=user, product__seller__isnull=True).update(is_selected=is_selected)
            else:
                Cart.objects.filter(user=user, product__seller_id=seller_id).update(is_selected=is_selected)
            cart_items = Cart.objects.filter(user=user).order_by('id')
            return Response(CartSerializer(cart_items, many=True).data)

        cart_item_id = request.data.get('cart_item_id')
        if not cart_item_id:
            return Response({'error': 'Parameter tidak lengkap'}, status=status.HTTP_400_BAD_REQUEST)

        cart_item = get_object_or_404(Cart, user=user, id=cart_item_id)

        # 4. Single item selection toggle
        if 'is_selected' in request.data:
            cart_item.is_selected = bool(request.data.get('is_selected'))
            cart_item.save()
            return Response(CartSerializer(cart_item).data)

        # 5. Quantity update
        new_quantity = request.data.get('quantity')
        if new_quantity is None:
            return Response({'error': 'Quantity required'}, status=status.HTTP_400_BAD_REQUEST)

        if int(new_quantity) <= 0:
            cart_item.delete()
            return Response({'message': 'Item dihapus dari keranjang'}, status=status.HTTP_200_OK)

        cart_item.quantity = int(new_quantity)
        cart_item.save()
        serializer = CartSerializer(cart_item)
        return Response(serializer.data)

    def delete(self, request):
        user = request.user
        cart_item_ids = request.data.get('cart_item_ids')
        if cart_item_ids and isinstance(cart_item_ids, list):
            Cart.objects.filter(user=user, id__in=cart_item_ids).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

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