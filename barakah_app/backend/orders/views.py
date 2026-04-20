# orders/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem
from carts.models import Cart # Assuming you have a Cart and CartItem model
from .serializers import OrderSerializer, OrderItemSerializer

class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        orders = Order.objects.filter(user=user)
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        checkout_configs = request.data.get('checkouts', [])
        # Provide fallback empty config map
        seller_configs = {str(c.get('seller_id')): c for c in checkout_configs}

        # Fetch only selected cart items for the user
        cart_items = Cart.objects.filter(user=user, is_selected=True)

        if not cart_items.exists():
            return Response({'message': 'No selected items in cart'}, status=status.HTTP_400_BAD_REQUEST)

        # Group by seller
        seller_carts = {}
        for item in cart_items:
            seller_id = str(item.product.seller_id) if item.product.seller_id else "0"
            if seller_id not in seller_carts:
                seller_carts[seller_id] = []
            seller_carts[seller_id].append(item)

        created_orders = []

        for s_id, items in seller_carts.items():
            config = seller_configs.get(s_id, {})
            seller_user = None
            if s_id != "0":
                from accounts.models import User
                seller_user = User.objects.filter(id=s_id).first()

            shipping_cost = config.get('shipping_cost', 0)
            shipping_courier = config.get('shipping_courier', '')
            shipping_service = config.get('shipping_service', '')
            voucher_code = config.get('voucher_code', '')
            voucher_nominal = config.get('voucher_nominal', 0)

            order = Order.objects.create(
                user=user,
                seller=seller_user,
                total_price=0,
                shipping_cost=shipping_cost,
                shipping_courier=shipping_courier,
                shipping_service=shipping_service,
                voucher_code=voucher_code,
                voucher_nominal=voucher_nominal
            )

            total_price = 0
            for cart_item in items:
                # Need extra price from variation
                base_price = cart_item.product.price
                if cart_item.variation and cart_item.variation.additional_price:
                    base_price += cart_item.variation.additional_price
                
                price_for_item = base_price * cart_item.quantity

                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    variation=cart_item.variation,
                    quantity=cart_item.quantity,
                    price=price_for_item
                )
                total_price += price_for_item

            order.total_price = total_price
            order.save() # recalculates grand_total via overridden save()
            created_orders.append(order)

        # Clear ALL checked cart items
        cart_items.delete()

        serializer = OrderSerializer(created_orders, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = request.user
        order_id = request.data.get('id')
        order = get_object_or_404(Order, user=user, id=order_id)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

