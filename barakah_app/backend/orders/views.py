# orders/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem, Product
from .serializers import OrderSerializer, OrderItemSerializer

class OrderView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure this is added

    def get(self, request):
        user = request.user
        donation_items = Order.objects.filter(donor=user)
        serializer = OrderSerializer(donation_items, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        user = request.user
        product_id = request.data.get('product_id')
        product = get_object_or_404(Product, id=product_id)

        order_item, created = Order.objects.get_or_create(user=user, product=product)
        if created:
            serializer = OrderSerializer(order_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({'message': 'Campaign already in wishlist'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        id = request.data.get('id')
        order_item = get_object_or_404(Order, user=user, id=id)
        order_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)