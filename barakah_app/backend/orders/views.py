# orders/views.py
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem
from carts.models import Cart # Assuming you have a Cart and CartItem model
from .serializers import OrderSerializer, OrderItemSerializer
# Removed dynamic Qrisly for now



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
        from decimal import Decimal
        import logging
        logger = logging.getLogger('accounts')
        
        try:
            # Extract list of checkout configurations (one per seller)
            checkouts_data = request.data.get('checkouts', [])
            # Map configurations by seller_id for easy access
            configs_by_seller = {str(c.get('seller_id')): c for c in checkouts_data}

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
            payment_proof = request.FILES.get('proof_file')

            for s_id, items in seller_carts.items():
                # Get config for this seller
                config = configs_by_seller.get(s_id, {})
                
                def clean_decimal(val):
                    try:
                        if val is None or str(val).strip() == "": return Decimal('0')
                        return Decimal(str(val))
                    except: return Decimal('0')

                shipping_cost = clean_decimal(config.get('shipping_cost', 0))
                shipping_courier = config.get('shipping_courier', '')
                shipping_service = config.get('shipping_service', '')
                voucher_code = config.get('voucher_code', '')
                voucher_nominal = clean_decimal(config.get('voucher_nominal', 0))
                payment_method = config.get('payment_method') or request.data.get('payment_method', 'manual')
                buyer_note = config.get('buyer_note') or request.data.get('buyer_note', '')

                seller_user = None
                if s_id != "0":
                    from accounts.models import User
                    seller_user = User.objects.filter(id=s_id).first()
                
                if not seller_user:
                    from accounts.models import User
                    seller_user = User.objects.filter(is_superuser=True).first()

                # Create Order
                order = Order.objects.create(
                    user=user,
                    seller=seller_user,
                    total_price=Decimal('0'),
                    shipping_cost=shipping_cost,
                    shipping_courier=shipping_courier,
                    shipping_service=shipping_service,
                    voucher_code=voucher_code,
                    voucher_nominal=voucher_nominal,
                    status='paid' if payment_proof else 'pending',
                    payment_method=payment_method,
                    payment_proof=payment_proof,
                    buyer_note=buyer_note
                )
                
                total_price = Decimal('0')
                for cart_item in items:
                    base_price = cart_item.product.price
                    if cart_item.variation and cart_item.variation.additional_price and cart_item.variation.additional_price > 0:
                        base_price = cart_item.variation.additional_price
                    
                    price_for_item = base_price * cart_item.quantity

                    # Stock reduction
                    if cart_item.variation:
                        if cart_item.variation.stock >= cart_item.quantity:
                            cart_item.variation.stock -= cart_item.quantity
                            cart_item.variation.save()
                        else:
                            cart_item.variation.stock = 0
                            cart_item.variation.save()
                        cart_item.product.sync_variations()
                    else:
                        if cart_item.product.stock >= cart_item.quantity:
                            cart_item.product.stock -= cart_item.quantity
                            cart_item.product.save()
                        else:
                            cart_item.product.stock = 0
                            cart_item.product.save()

                    OrderItem.objects.create(
                        order=order,
                        product=cart_item.product,
                        variation=cart_item.variation,
                        quantity=cart_item.quantity,
                        price=price_for_item
                    )
                    total_price += price_for_item

                order.total_price = total_price
                order.grand_total = total_price + shipping_cost - voucher_nominal
                if order.grand_total < 0: order.grand_total = Decimal('0')
                order.save() 
                created_orders.append(order)

            # Clear selected cart items
            cart_items.delete()

            # Send Notifications for each created order
            from .utils import send_order_invoice_to_buyer, send_order_notification_to_seller
            customer_phone = request.data.get('customer_phone') or request.data.get('phone')
            
            for order in created_orders:
                try:
                    res_buyer = send_order_invoice_to_buyer(order, alternate_phone=customer_phone)
                    if res_buyer and not res_buyer.get('success'):
                        logger.error(f"WA Buyer Fail ({order.order_number}): {res_buyer.get('message')}")
                        
                    res_seller = send_order_notification_to_seller(order)
                    if res_seller and not res_seller.get('success'):
                        logger.error(f"WA Seller Fail ({order.order_number}): {res_seller.get('message')}")
                except Exception as e:
                    logger.error(f"WA Notification Error ({order.order_number}): {str(e)}")

            serializer = OrderSerializer(created_orders, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"CreateOrderView Critical Error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'message': f'Server Error: {str(e)}', 'details': 'Pastikan kolom database sudah terupdate dan folder media tersedia.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            # Admins can see orders assigned to ANY superuser (central orders)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            superusers = User.objects.filter(is_superuser=True)
            return Order.objects.filter(seller__in=superusers).order_by('-created_at')
        return Order.objects.filter(seller=user).order_by('-created_at')

    def partial_update(self, request, *args, **kwargs):
        # Simply update without auto-sending WA
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Hanya admin yang dapat menghapus pesanan'}, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        
        # Return stock before deleting
        for item in instance.items.all():
            if item.variation:
                item.variation.stock += item.quantity
                item.variation.save()
                item.product.sync_variations()
            else:
                item.product.stock += item.quantity
                item.product.save()
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='send-wa-update')
    def send_wa_update(self, request, pk=None):
        """Manual trigger to send WA status update to buyer."""
        instance = self.get_object()
        from .utils import send_status_update_notification
        try:
            result = send_status_update_notification(instance)
            if result and result.get('success'):
                return Response({'message': 'Notifikasi WA berhasil dikirim'})
            return Response({'error': result.get('message') if result else 'Gagal mengirim'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get order statistics for notification badges."""
        user = request.user
        queryset = self.get_queryset()
        pending_count = queryset.filter(status__iexact='Pending').count()
        return Response({
            'pending_count': pending_count
        })

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="rekap_pesanan_sinergy.csv"'
        
        # BOM for Excel UTF-8 support
        response.write(u'\ufeff'.encode('utf8'))
        
        writer = csv.writer(response)
        writer.writerow([
            'Order Number', 'Tanggal', 'Nama Pembeli', 'HP Pembeli', 
            'Penjual', 'Produk', 'Total Harga', 'Ongkir', 
            'Diskon Voucher', 'Grand Total', 'Status', 'Metode Bayar', 'Catatan'
        ])
        
        for order in queryset:
            items_desc = ", ".join([f"{item.product.title} (x{item.quantity})" for item in order.items.all()])
            writer.writerow([
                order.order_number,
                order.created_at.strftime('%Y-%m-%d %H:%M'),
                order.user.username,
                order.user.phone or '-',
                order.seller.username if order.seller else '-',
                items_desc,
                order.total_price,
                order.shipping_cost,
                order.voucher_nominal,
                order.grand_total,
                order.status,
                order.payment_method,
                order.buyer_note or '-'
            ])
            
        return response

