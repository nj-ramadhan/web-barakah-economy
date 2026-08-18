# orders/views.py
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging

from .models import Order, OrderItem
from carts.models import Cart
from .serializers import OrderSerializer, OrderItemSerializer
from transactions.models import UserWallet, WalletTransaction

logger = logging.getLogger('accounts')


def perform_order_maintenance():
    """
    1. Auto-complete orders older than 7 days shipped.
    2. Auto-cancel pending orders older than 48 hours (2x24 jam), restore stock, and refund if paid.
    """
    now = timezone.now()
    try:
        # 1. Auto-complete shipped orders
        Order.objects.filter(status='Dikirim', auto_complete_at__lte=now).update(
            status='Selesai',
            completed_at=now
        )

        # 2. Auto-cancel pending orders older than 48 hours
        deadline_48h = now - timedelta(hours=48)
        expired_pending_orders = Order.objects.filter(status='Pending', created_at__lte=deadline_48h)
        for ord_obj in expired_pending_orders:
            restore_order_stock(ord_obj)
            refund_order_to_wallet(ord_obj, reason_note="Otomatis sistem: tidak diproses penjual dalam 48 jam")
            ord_obj.status = 'Batal'
            ord_obj.cancelled_at = now
            ord_obj.cancel_request_reason = 'Dibatalkan otomatis oleh sistem (tidak diproses penjual dalam 48 jam)'
            ord_obj.save()
    except Exception as e:
        logger.error(f"Error in perform_order_maintenance: {e}")


def restore_order_stock(order):
    """Restore inventory stock when an order is cancelled or deleted."""
    try:
        for item in order.items.all():
            if item.variation:
                item.variation.stock += item.quantity
                item.variation.save()
                item.product.sync_variations()
            else:
                item.product.stock += item.quantity
                item.product.save()
    except Exception as e:
        logger.error(f"Error restoring stock for order {order.order_number}: {e}")


def refund_order_to_wallet(order, reason_note=''):
    """Safely refund paid money or used Saldo BAE back to buyer's UserWallet."""
    try:
        if WalletTransaction.objects.filter(order=order, transaction_type='REFUND').exists():
            return

        is_non_cod = (order.payment_method or '').lower() != 'cod'
        refund_amount = Decimal('0')

        if order.used_balance and order.used_balance > 0:
            refund_amount = order.used_balance
        elif is_non_cod and ((order.status or '').lower() == 'paid' or order.payment_proof):
            refund_amount = order.grand_total

        if refund_amount > 0:
            wallet = UserWallet.get_or_create_wallet(order.user)
            desc = f"Pengembalian dana (Refund) pembatalan pesanan #{order.order_number}"
            if reason_note:
                desc += f" - {reason_note}"
            wallet.credit(
                amount=refund_amount,
                transaction_type='REFUND',
                description=desc,
                reference_order=order
            )
            logger.info(f"Successfully refunded Rp {refund_amount:,.0f} to {order.user.username} for order {order.order_number}")
    except Exception as e:
        logger.error(f"Error refunding order {order.order_number}: {e}")


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        perform_order_maintenance()
        user = request.user
        orders = Order.objects.filter(user=user).order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)

    def delete(self, request):
        """Cleanly cancel and remove an unpaid pending order when user closes payment/QRIS modal."""
        user = request.user
        order_id = request.query_params.get('order_id') or request.data.get('order_id') or request.query_params.get('order_number') or request.data.get('order_number')
        if not order_id:
            return Response({'error': 'Parameter order_id wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.filter(user=user, pk=order_id).first() if str(order_id).isdigit() else Order.objects.filter(user=user, order_number=order_id).first()
        if not order:
            return Response({'error': 'Pesanan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

        # Only allow hard deletion if order is still unpaid/pending
        if (order.status or '').lower() in ['pending', 'unpaid', 'waiting_payment'] and not order.payment_proof:
            restore_order_stock(order)
            order.delete()
            return Response({'success': True, 'message': 'Pesanan pending belum bayar berhasil dibatalkan dan tidak masuk riwayat belanja.'})

        return Response({'error': 'Pesanan sudah diproses atau sudah dibayar, tidak dapat dihapus instan.'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        perform_order_maintenance()
        user = request.user

        try:
            # If order_id or order_number is provided, update existing order with proof_file
            order_id = request.data.get('order_id') or request.data.get('order_number') or request.data.get('orderId')
            if order_id:
                existing_orders = Order.objects.filter(user=user, pk=order_id) if str(order_id).isdigit() else Order.objects.filter(user=user, order_number=order_id)
                if not existing_orders.exists():
                    existing_orders = Order.objects.filter(pk=order_id) if str(order_id).isdigit() else Order.objects.filter(order_number=order_id)

                if existing_orders.exists():
                    payment_proof = request.FILES.get('proof_file') or request.FILES.get('payment_proof')
                    updated_orders = []
                    for ord_obj in existing_orders:
                        if payment_proof:
                            ord_obj.payment_proof = payment_proof
                            ord_obj.status = 'paid'
                        if request.data.get('payment_method'):
                            ord_obj.payment_method = request.data.get('payment_method')
                        ord_obj.save()
                        updated_orders.append(ord_obj)

                        try:
                            from .utils import send_order_invoice_to_buyer, send_order_notification_to_seller
                            customer_phone = request.data.get('customer_phone') or request.data.get('phone')
                            send_order_invoice_to_buyer(ord_obj, alternate_phone=customer_phone)
                            send_order_notification_to_seller(ord_obj)
                        except Exception as e:
                            logger.error(f"WA Notification Error on Payment Update ({ord_obj.order_number}): {str(e)}")

                    serializer = OrderSerializer(updated_orders, many=True)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)

            # Extract list of checkout configurations (one per seller)
            checkouts_data = request.data.get('checkouts', [])
            configs_by_seller = {str(c.get('seller_id')): c for c in checkouts_data}

            # Fetch cart items for the user
            cart_items = Cart.objects.filter(user=user, is_selected=True)
            if not cart_items.exists():
                cart_items = Cart.objects.filter(user=user)

            if not cart_items.exists():
                return Response({'message': 'Keranjang belanja kosong'}, status=status.HTTP_400_BAD_REQUEST)

            # Group by seller
            seller_carts = {}
            for item in cart_items:
                seller_id = str(item.product.seller_id) if item.product.seller_id else "0"
                if seller_id not in seller_carts:
                    seller_carts[seller_id] = []
                seller_carts[seller_id].append(item)

            def clean_decimal(val):
                try:
                    if val is None or str(val).strip() == "": return Decimal('0')
                    return Decimal(str(val))
                except: return Decimal('0')

            created_orders = []
            payment_proof = request.FILES.get('proof_file')
            global_payment_method = request.data.get('payment_method', 'manual')
            use_saldo_bae = request.data.get('use_saldo_bae', False) or global_payment_method in ['saldo_bae', 'hybrid']

            # Check wallet if using Saldo BAE
            wallet = UserWallet.get_or_create_wallet(user)
            available_user_balance = wallet.balance if use_saldo_bae else Decimal('0')

            global_admin_fee = clean_decimal(request.data.get('admin_fee') or request.data.get('unique_code') or 0)

            for s_id, items in seller_carts.items():
                config = configs_by_seller.get(str(s_id)) or configs_by_seller.get(s_id) or (checkouts_data[0] if checkouts_data else {})

                shipping_cost = clean_decimal(config.get('shipping_cost', 0))
                shipping_courier = config.get('shipping_courier', '')
                shipping_service = config.get('shipping_service', '')
                voucher_code = config.get('voucher_code', '')
                voucher_nominal = clean_decimal(config.get('voucher_nominal', 0))
                payment_method = config.get('payment_method') or global_payment_method
                recipient_name = config.get('recipient_name') or request.data.get('recipient_name') or request.data.get('customer_name')
                recipient_phone = config.get('recipient_phone') or request.data.get('recipient_phone') or request.data.get('customer_phone')
                shipping_address = config.get('shipping_address') or request.data.get('shipping_address')
                shipping_village = config.get('shipping_village') or request.data.get('shipping_village')
                shipping_district = config.get('shipping_district') or request.data.get('shipping_district')
                shipping_city = config.get('shipping_city') or request.data.get('shipping_city')
                shipping_province = config.get('shipping_province') or request.data.get('shipping_province')
                shipping_postal_code = config.get('shipping_postal_code') or request.data.get('shipping_postal_code')
                shipping_address_detail = config.get('shipping_address_detail') or request.data.get('shipping_address_detail')
                shipping_coordinates = config.get('shipping_coordinates') or request.data.get('shipping_coordinates')
                buyer_note = config.get('buyer_note') or request.data.get('buyer_note') or ''

                seller_user = None
                if s_id != "0":
                    from accounts.models import User
                    seller_user = User.objects.filter(id=s_id).first()

                if not seller_user:
                    from accounts.models import User
                    seller_user = User.objects.filter(is_superuser=True).first()

                # Check if seller uses their own bank details
                first_item = items[0]
                product = first_item.product
                paid_directly = product.own_bank_status == 'approved'

                # Calculate item total using actual promo / campaign discounts
                from .utils import calculate_product_item_price
                total_price = Decimal('0')
                item_pricing_map = {}
                for cart_item in items:
                    unit_price = calculate_product_item_price(
                        product=cart_item.product,
                        variation=cart_item.variation,
                        quantity=cart_item.quantity
                    )
                    item_pricing_map[cart_item.id] = unit_price
                    total_price += (unit_price * cart_item.quantity)

                # Validate Voucher Toko if provided
                if voucher_code:
                    try:
                        from products.models import ShopVoucher
                        v_qs = ShopVoucher.objects.filter(code__iexact=voucher_code, is_active=True)
                        if seller_user:
                            v_qs = v_qs.filter(seller=seller_user)
                        voucher_obj = v_qs.first()
                        if voucher_obj and (voucher_obj.quantity == -1 or voucher_obj.quantity > 0):
                            voucher_nominal = Decimal(str(voucher_obj.nominal))
                            if voucher_obj.quantity > 0:
                                voucher_obj.quantity -= 1
                                voucher_obj.save(update_fields=['quantity'])
                    except Exception as e:
                        logger.error(f"Voucher verification error: {e}")

                admin_fee = clean_decimal(config.get('admin_fee') if config.get('admin_fee') is not None else (global_admin_fee if len(created_orders) == 0 else 0))
                grand_total = total_price + shipping_cost - voucher_nominal + admin_fee
                if grand_total < 0: grand_total = Decimal('0')

                # Saldo BAE / Hybrid deduction logic
                used_balance_for_this_order = Decimal('0')
                order_initial_status = 'pending'

                if payment_proof:
                    order_initial_status = 'paid'
                elif payment_method == 'cod':
                    order_initial_status = 'Pending'
                elif payment_method == 'saldo_bae' or (use_saldo_bae and available_user_balance >= grand_total):
                    if available_user_balance < grand_total:
                        return Response({'message': f'Saldo BAE tidak mencukupi untuk pesanan {product.title}. Saldo Anda: Rp {available_user_balance:,.0f}'}, status=status.HTTP_400_BAD_REQUEST)
                    used_balance_for_this_order = grand_total
                    available_user_balance -= grand_total
                    payment_method = 'saldo_bae'
                    order_initial_status = 'paid'
                elif payment_method == 'hybrid' or (use_saldo_bae and available_user_balance > 0):
                    used_balance_for_this_order = min(available_user_balance, grand_total)
                    available_user_balance -= used_balance_for_this_order
                    payment_method = 'hybrid'
                    order_initial_status = 'paid' if used_balance_for_this_order >= grand_total else 'pending'

                # Create Order
                order = Order.objects.create(
                    user=user,
                    seller=seller_user,
                    total_price=total_price,
                    shipping_cost=shipping_cost,
                    shipping_courier=shipping_courier,
                    shipping_service=shipping_service,
                    voucher_code=voucher_code,
                    voucher_nominal=voucher_nominal,
                    grand_total=grand_total,
                    used_balance=used_balance_for_this_order,
                    status=order_initial_status,
                    payment_method=payment_method,
                    payment_proof=payment_proof,
                    buyer_note=buyer_note,
                    paid_to_seller_directly=paid_directly,
                    seller_bank_name=product.own_bank_name if paid_directly else None,
                    seller_bank_account=product.own_bank_account if paid_directly else None,
                    seller_bank_holder=product.own_bank_holder if paid_directly else None,
                    seller_qris_image=product.own_qris_image if paid_directly else None,
                    recipient_name=recipient_name,
                    recipient_phone=recipient_phone,
                    shipping_address=shipping_address,
                    shipping_village=shipping_village,
                    shipping_district=shipping_district,
                    shipping_city=shipping_city,
                    shipping_province=shipping_province,
                    shipping_postal_code=shipping_postal_code,
                    shipping_address_detail=shipping_address_detail,
                    shipping_coordinates=shipping_coordinates
                )

                # Debit wallet if used_balance > 0
                if used_balance_for_this_order > 0:
                    wallet.debit(
                        amount=used_balance_for_this_order,
                        transaction_type='PAYMENT',
                        description=f"Pembayaran belanja e-commerce pesanan #{order.order_number}",
                        reference_order=order
                    )

                # Create Order Items and decrease stock
                for cart_item in items:
                    unit_price = item_pricing_map.get(cart_item.id, cart_item.product.price)

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
                        price=unit_price
                    )

                created_orders.append(order)

            # Clear selected cart items
            cart_items.delete()

            # Send Notifications for each created order
            from .utils import send_order_invoice_to_buyer, send_order_notification_to_seller, send_order_email_notifications
            customer_phone = request.data.get('customer_phone') or request.data.get('phone')

            for order in created_orders:
                try:
                    send_order_invoice_to_buyer(order, alternate_phone=customer_phone)
                    send_order_notification_to_seller(order)
                    send_order_email_notifications(order)
                except Exception as e:
                    logger.error(f"Notification Error ({order.order_number}): {str(e)}")

            serializer = OrderSerializer(created_orders, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"CreateOrderView Critical Error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'message': f'Server Error: {str(e)}', 'details': 'Terjadi kesalahan saat memproses pesanan.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):
        user = request.user
        order_id = request.data.get('id')
        order = get_object_or_404(Order, user=user, id=order_id)
        restore_order_stock(order)
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer

    def get_queryset(self):
        perform_order_maintenance()
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        perform_order_maintenance()
        return Order.objects.filter(user=self.request.user)


class SellerOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        perform_order_maintenance()
        user = self.request.user

        # For single object operations (retrieve, patch, etc), allow if user is either buyer, seller, or superuser
        if self.action in ['retrieve', 'partial_update', 'update', 'destroy']:
            if user.is_superuser:
                return Order.objects.all()
            from django.db.models import Q
            return Order.objects.filter(Q(seller=user) | Q(user=user)).distinct()

        # Check if admin master view requested
        is_admin_all = self.request.query_params.get('all') == 'true' and user.is_superuser
        if is_admin_all:
            queryset = Order.objects.all().order_by('-created_at')
        else:
            # Strictly lock to logged in user's seller orders
            queryset = Order.objects.filter(seller=user).order_by('-created_at')

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param and status_param.lower() != 'all':
            if status_param.lower() in ['paid', 'lunas']:
                queryset = queryset.filter(status__in=['paid', 'Paid', 'Lunas', 'lunas'])
            elif status_param.lower() in ['pending', 'menunggu']:
                queryset = queryset.filter(status__in=['pending', 'Pending', 'waiting_payment', 'unpaid'])
            elif status_param.lower() in ['proses', 'processing']:
                queryset = queryset.filter(status__in=['proses', 'Proses', 'Processing'])
            elif status_param.lower() in ['dikirim', 'shipped']:
                queryset = queryset.filter(status__in=['dikirim', 'Dikirim', 'Shipped'])
            elif status_param.lower() in ['selesai', 'completed']:
                queryset = queryset.filter(status__in=['selesai', 'Selesai', 'Completed'])
            elif status_param.lower() in ['batal', 'cancelled']:
                queryset = queryset.filter(status__in=['batal', 'Batal', 'Cancelled'])
            elif status_param.lower() in ['komplain', 'dispute']:
                queryset = queryset.filter(status__in=['komplain', 'Komplain', 'Dispute'])
            else:
                queryset = queryset.filter(status__iexact=status_param)

        # Search filter (order_number, buyer name, product title)
        search_query = self.request.query_params.get('search')
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(order_number__icontains=search_query) |
                Q(recipient_name__icontains=search_query) |
                Q(user__username__icontains=search_query) |
                Q(items__product__title__icontains=search_query)
            ).distinct()

        return queryset

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        action_type = request.data.get('action')
        complaint_reason = request.data.get('complaint_reason') or request.data.get('cancel_reason')

        # 1. Enforce Immutability for Terminal Statuses
        if instance.status in ['Selesai', 'Batal'] and new_status != instance.status:
            return Response(
                {'error': f'Pesanan dengan status {instance.status} sudah permanen dan tidak dapat diubah lagi.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Buyer Cancellation / Dispute Workflow
        is_buyer = (instance.user == user)
        is_seller = (instance.seller == user or user.is_superuser)

        # Buyer Submitting Cancellation Discussion / Dispute on Processed/Shipped order
        if is_buyer and (action_type == 'request_cancel' or request.data.get('cancel_request_status') == 'pending'):
            if instance.status in ['Selesai', 'Batal']:
                return Response({'error': f'Pesanan {instance.status} tidak dapat diajukan pembatalan.'}, status=status.HTTP_400_BAD_REQUEST)
            instance.cancel_request_status = 'pending'
            instance.cancel_request_reason = complaint_reason or 'Permohonan pembatalan diajukan oleh pembeli'
            instance.cancel_requested_at = timezone.now()
            instance.save()
            return Response(OrderSerializer(instance).data)

        # Buyer cancelling order
        if is_buyer and not is_seller and new_status in ['Batal', 'cancelled', 'Cancelled']:
            current_status_lower = (instance.status or '').lower()
            is_unprocessed = current_status_lower in ['pending', 'menunggu', 'paid']

            if not is_unprocessed:
                # If already processed or shipped, buyer cannot unilaterally cancel, must submit request
                instance.cancel_request_status = 'pending'
                instance.cancel_request_reason = complaint_reason or 'Pengajuan pembatalan oleh pembeli'
                instance.cancel_requested_at = timezone.now()
                instance.save()
                return Response({
                    'message': 'Pengajuan pembatalan telah dikirim ke penjual untuk ditinjau / didiskusikan.',
                    'order': OrderSerializer(instance).data
                })

            # Direct cancel allowed for unprocessed orders
            restore_order_stock(instance)
            refund_order_to_wallet(instance, reason_note="Dibatalkan oleh pembeli")
            instance.status = 'Batal'
            instance.cancelled_at = timezone.now()
            instance.cancelled_by = user
            if complaint_reason:
                instance.cancel_request_reason = complaint_reason
            instance.save()
            return Response(OrderSerializer(instance).data)

        # Seller / Admin approving cancellation
        if is_seller and new_status in ['Batal', 'cancelled', 'Cancelled']:
            restore_order_stock(instance)
            refund_order_to_wallet(instance, reason_note="Dibatalkan / disetujui penjual")
            instance.status = 'Batal'
            instance.cancel_request_status = 'approved'
            instance.cancelled_at = timezone.now()
            instance.cancelled_by = user
            if complaint_reason:
                instance.cancel_request_reason = complaint_reason
            instance.save()
            return Response(OrderSerializer(instance).data)

        # Seller rejecting cancel request
        if is_seller and request.data.get('cancel_request_status') == 'rejected':
            instance.cancel_request_status = 'rejected'
            instance.save()
            return Response(OrderSerializer(instance).data)

        # Buyer setting 'Selesai' or 'Komplain'
        if is_buyer and not is_seller:
            if new_status in ['Selesai', 'Komplain']:
                if instance.status not in ['Dikirim', 'shipped', 'Proses']:
                    return Response(
                        {'error': 'Komplain atau konfirmasi selesai hanya dapat dilakukan jika barang sudah dikirim atau diproses.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'Sebagai pembeli, Anda hanya dapat menyelesaikan pesanan, mengajukan komplain, atau membatalkan pesanan sebelum diproses.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Sequential status updates for sellers/admins
        if new_status:
            allowed_transitions = {
                'Pending': ['Pending', 'Paid', 'Batal'],
                'Paid': ['Paid', 'Proses', 'Batal'],
                'Proses': ['Proses', 'Dikirim', 'Batal'],
                'Dikirim': ['Dikirim', 'Selesai', 'Komplain', 'Batal'],
                'Komplain': ['Komplain', 'Selesai', 'Proses', 'Batal'],
                'Selesai': ['Selesai'],
                'Batal': ['Batal']
            }
            current_allowed = allowed_transitions.get(instance.status, ['Pending', 'Paid', 'Proses', 'Dikirim', 'Komplain', 'Selesai', 'Batal'])
            if new_status not in current_allowed:
                return Response(
                    {'error': f'Status tidak dapat diubah dari {instance.status} ke {new_status}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if new_status == 'Dikirim':
                instance.shipped_at = timezone.now()
                instance.auto_complete_at = instance.shipped_at + timedelta(days=7)
            elif new_status == 'Komplain':
                instance.complaint_at = timezone.now()
                if complaint_reason:
                    instance.complaint_reason = complaint_reason
            elif new_status == 'Selesai':
                instance.completed_at = timezone.now()

        return super().partial_update(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        from .utils import check_all_deliveries
        report = check_all_deliveries()
        return Response(report)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Hanya admin yang dapat menghapus pesanan'}, status=status.HTTP_403_FORBIDDEN)

        instance = self.get_object()
        restore_order_stock(instance)
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


class UnreviewedProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        completed_orders = Order.objects.filter(
            user=user,
            status__in=['Selesai', 'Completed', 'selesai', 'completed', 'delivered', 'Delivered']
        ).order_by('-created_at')

        from products.models import Testimoni

        unreviewed_items = []
        seen_product_ids = set()

        for order in completed_orders:
            for item in order.items.all():
                if item.product and item.product.id not in seen_product_ids:
                    has_reviewed = Testimoni.objects.filter(product=item.product, user=user).exists()
                    if not has_reviewed:
                        seen_product_ids.add(item.product.id)
                        thumbnail_url = item.product.thumbnail.url if (item.product.thumbnail and hasattr(item.product.thumbnail, 'url')) else None
                        unreviewed_items.append({
                            'order_id': order.id,
                            'order_number': order.order_number,
                            'product_id': item.product.id,
                            'product_title': item.product.title,
                            'product_slug': item.product.slug,
                            'product_thumbnail': thumbnail_url,
                            'price': float(item.price),
                            'completed_at': order.completed_at or order.updated_at
                        })

        return Response(unreviewed_items)
