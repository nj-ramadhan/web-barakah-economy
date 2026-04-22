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
from events.ocr_service import extract_payment_proof_data
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
            # Extract and validate inputs
            def clean_decimal(val):
                try:
                    if val is None or str(val).strip() == "":
                        return Decimal('0')
                    return Decimal(str(val))
                except:
                    return Decimal('0')

            shipping_cost = clean_decimal(request.data.get('shipping_cost', 0))
            shipping_courier = request.data.get('shipping_courier', '')
            voucher_code = request.data.get('voucher_code', '')
            voucher_nominal = clean_decimal(request.data.get('voucher_nominal', 0))
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
                
                # Fallback to first superuser if product has no seller (Official BAE products)
                if not seller_user:
                    from accounts.models import User
                    seller_user = User.objects.filter(is_superuser=True).first()

                # Create Order
                order = Order.objects.create(
                    user=user,
                    seller=seller_user,
                    total_price=Decimal('0'),
                    shipping_cost=shipping_cost if not created_orders else Decimal('0'),
                    shipping_courier=shipping_courier,
                    voucher_code=voucher_code,
                    voucher_nominal=voucher_nominal if not created_orders else Decimal('0'),
                    status='paid' if proof_file else 'pending',
                    payment_method=payment_method,
                    payment_proof=proof_file
                )
                
                total_price = Decimal('0')
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
                order.grand_total = total_price + Decimal(str(order.shipping_cost)) - Decimal(str(order.voucher_nominal))
                if order.grand_total < 0:
                    order.grand_total = Decimal('0')
                
                # Perform OCR Validation if proof is uploaded
                if proof_file:
                    expected_amount = Decimal(str(order.grand_total))
                    ocr_result = extract_payment_proof_data(proof_file, expected_amount=expected_amount)
                    
                    if '_error' in ocr_result:
                        # Allow order creation but set status back to pending if AI fails?
                        # Or block? User said "harus", so let's block or return error.
                        return Response({"error": ocr_result['_error']}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Validate Recipient
                    if not ocr_result.get('is_to_bae', False):
                        return Response({
                            "error": f"Penerima tidak valid (Terdeteksi: {ocr_result.get('recipient_name', 'Tidak dikenal')}). Transfer harus ditujukan ke BAE Community."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Validate Amount
                    if not ocr_result.get('amount_match', False):
                        detected = ocr_result.get('amount', 0)
                        return Response({
                            "error": f"Nominal transfer tidak sesuai. Diharapkan: Rp {expected_amount:,.0f}, Terdeteksi: Rp {detected:,.0f}. Silakan unggah bukti yang benar."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    # Validate Date
                    if not ocr_result.get('date_match', False):
                        detected_date = ocr_result.get('transaction_date', 'Tidak terdeteksi')
                        return Response({
                            "error": f"Tanggal transaksi tidak valid (Terdeteksi: {detected_date}). Bukti transfer harus dari hari ini atau maksimal 1 hari sebelumnya."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    order.ocr_verified = True
                    order.ocr_data = ocr_result
                    order.status = 'paid' # Or 'verified' depends on system

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
    http_method_names = ['get', 'patch', 'head', 'options']

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

class ProofUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        proof_file = request.FILES.get('proof_file')
        
        if not proof_file:
            return Response({'error': 'Bukti transfer wajib diunggah.'}, status=status.HTTP_400_BAD_REQUEST)

        # Perform OCR Validation
        expected_amount = Decimal(str(order.grand_total))
        ocr_result = extract_payment_proof_data(proof_file, expected_amount=expected_amount)
        
        if '_error' in ocr_result:
            return Response({"error": ocr_result['_error']}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate Recipient
        if not ocr_result.get('is_to_bae', False):
            return Response({
                "error": f"Penerima tidak valid (Terdeteksi: {ocr_result.get('recipient_name', 'Tidak dikenal')}). Transfer harus ditujukan ke BAE Community."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate Amount
        if not ocr_result.get('amount_match', False):
            detected = ocr_result.get('amount', 0)
            return Response({
                "error": f"Nominal transfer tidak sesuai. Diharapkan: Rp {expected_amount:,.0f}, Terdeteksi: Rp {detected:,.0f}. Silakan unggah bukti yang benar."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate Date
        if not ocr_result.get('date_match', False):
            detected_date = ocr_result.get('transaction_date', 'Tidak terdeteksi')
            return Response({
                "error": f"Tanggal transaksi tidak valid (Terdeteksi: {detected_date}). Bukti transfer harus dari hari ini atau maksimal 1 hari sebelumnya."
            }, status=status.HTTP_400_BAD_REQUEST)

        order.payment_proof = proof_file
        order.status = 'paid'
        order.ocr_verified = True
        order.ocr_data = ocr_result
        order.save()

        return Response({
            'message': 'Bukti pembayaran berhasil diverifikasi otomatis oleh AI',
            'order': OrderSerializer(order).data
        })
