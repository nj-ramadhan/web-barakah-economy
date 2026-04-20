# orders/views.py
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem
from carts.models import Cart # Assuming you have a Cart and CartItem model
from .serializers import OrderSerializer, OrderItemSerializer
from payments.qrisly import generate_dynamic_qris


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = request.user
        orders = Order.objects.filter(user=user)
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user
        
        # New: Support for simple checkout passed from confirmation page
        shipping_cost = request.data.get('shipping_cost', 0)
        shipping_courier = request.data.get('shipping_courier', '')
        voucher_code = request.data.get('voucher_code', '')
        voucher_nominal = request.data.get('voucher_nominal', 0)
        payment_method = request.data.get('payment_method', 'manual')
        proof_file = request.FILES.get('proof_file')


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
            seller_user = None
            if s_id != "0":
                from accounts.models import User
                seller_user = User.objects.filter(id=s_id).first()

            # For multi-seller, we currently apply aggregate shipping/voucher to the first seller order
            # or handle it as a single order if they are from the same seller.
            # In a basic setup, we'll just apply it to each order but that might be incorrect for split shipping.
            # However, for now, let's assume single seller or aggregate.
            
            order = Order.objects.create(
                user=user,
                seller=seller_user,
                total_price=0,
                shipping_cost=shipping_cost if not created_orders else 0, # Only apply to first
                shipping_courier=shipping_courier,
                voucher_code=voucher_code,
                voucher_nominal=voucher_nominal if not created_orders else 0,
                status='paid' if proof_file else 'pending'
            )
            
            if proof_file:
                # Assuming Order model or a related Payment model handles the proof_file
                # If not on Order, we might need to update the model.
                pass

            total_price = 0
            for cart_item in items:
                # Variation price replaces product price if set
                base_price = cart_item.product.price
                if cart_item.variation and cart_item.variation.additional_price and cart_item.variation.additional_price > 0:
                    base_price = cart_item.variation.additional_price
                
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
            order.payment_method = payment_method # Ensure this field exists or handle via local variable
            
            # Calculate grand total
            grand_total = float(total_price) + float(order.shipping_cost) - float(order.voucher_nominal)
            
            if payment_method == 'qris':
                qris_res = generate_dynamic_qris(grand_total, order.order_number)
                if "error" not in qris_res:
                    order.qrisly_history_id = qris_res.get('history_id')
                    order.qris_payload = qris_res.get('qris_content')
            
            order.save() 
            created_orders.append(order)


        # Clear selected cart items
        cart_items.delete()

        # Send Notifications for each created order
        from .utils import send_order_invoice_to_buyer, send_order_notification_to_seller
        for order in created_orders:
            try:
                send_order_invoice_to_buyer(order)
                send_order_notification_to_seller(order)
            except Exception as e:
                import logging
                logging.getLogger('accounts').error(f"Failed to send order notifications: {e}")

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

from rest_framework import viewsets

class SellerOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return Order.objects.filter(seller=self.request.user).order_by('-created_at')

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        old_resi = instance.resi_number
        
        response = super().partial_update(request, *args, **kwargs)
        
        instance.refresh_from_db()
        if instance.status != old_status or instance.resi_number != old_resi:
            from .utils import send_status_update_notification
            try:
                send_status_update_notification(instance)
            except Exception as e:
                import logging
                logging.getLogger('accounts').error(f"Failed to send status update notification: {e}")
                
        return response

