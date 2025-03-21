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

        # Fetch all cart items for the user
        cart_items = Cart.objects.filter(user=user)

        if not cart_items.exists():
            return Response({'message': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # Create a new order
        order = Order.objects.create(user=user, total_price=0)  # Initialize total_price as 0

        total_price = 0
        for cart_item in cart_items:
            product = cart_item.product
            quantity = cart_item.quantity
            price = cart_item.total_price()  # Use the total_price method from the Cart model

            # Create an OrderItem for each cart item
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=price
            )

            total_price += price

        # Update the total price of the order
        order.total_price = total_price
        order.save()

        # Clear the cart after the order is created
        cart_items.delete()

        serializer = OrderSerializer(order)
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

