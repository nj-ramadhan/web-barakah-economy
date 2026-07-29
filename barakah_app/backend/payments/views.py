# payments/views.py
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
from midtransclient import Snap
from donations.models import Donation
from campaigns.models import Campaign
from orders.models import Order
from .models import PaymentSetting
from .serializers import PaymentSettingSerializer
from .dynaqris_service import DynaQRISService
import logging

logger = logging.getLogger(__name__)

# Initialize Midtrans Snap client
snap = Snap(
    is_production=not settings.MIDTRANS_SANDBOX,  # Use sandbox if MIDTRANS_SANDBOX is True
    server_key=settings.MIDTRANS_SERVER_KEY,
    client_key=settings.MIDTRANS_CLIENT_KEY
)

class PaymentPublicConfigView(APIView):
    """Public endpoint for retrieving active payment configuration."""
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = PaymentSetting.get_settings()
        serializer = PaymentSettingSerializer(settings_obj, context={'request': request})
        # Mask sensitive api key for public view
        data = serializer.data
        data.pop('dynaqris_api_key', None)
        return Response(data)

class PaymentAdminSettingsView(APIView):
    """Admin endpoint for viewing and managing payment settings."""
    permission_classes = [IsAuthenticated]

    def check_admin_permission(self, request):
        user = request.user
        return user.is_staff or getattr(user, 'role', '') == 'admin' or getattr(user, 'username', '') == 'admin'

    def get(self, request):
        if not self.check_admin_permission(request):
            return Response({'detail': 'Akses ditolak. Membutuhkan hak akses admin.'}, status=status.HTTP_403_FORBIDDEN)
        settings_obj = PaymentSetting.get_settings()
        serializer = PaymentSettingSerializer(settings_obj, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        if not self.check_admin_permission(request):
            return Response({'detail': 'Akses ditolak. Membutuhkan hak akses admin.'}, status=status.HTTP_403_FORBIDDEN)
        settings_obj = PaymentSetting.get_settings()
        serializer = PaymentSettingSerializer(settings_obj, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TestDynaQRISConnectionView(APIView):
    """Admin endpoint to test DynaQRIS credentials."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not (user.is_staff or getattr(user, 'role', '') == 'admin' or getattr(user, 'username', '') == 'admin'):
            return Response({'detail': 'Akses ditolak.'}, status=status.HTTP_403_FORBIDDEN)

        api_key = request.data.get('dynaqris_api_key') or PaymentSetting.get_settings().dynaqris_api_key
        qris_id = request.data.get('dynaqris_qris_id') or PaymentSetting.get_settings().dynaqris_qris_id

        if not api_key or not qris_id:
            return Response({'error': 'API Key dan QRIS ID wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        import requests
        headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        payload = {"qrisId": qris_id, "amount": 10000}

        try:
            res = requests.post("https://dynaqris.web.id/api/v1/convert", json=payload, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return Response({
                    "success": True,
                    "message": "Koneksi DynaQRIS Berhasil!",
                    "qrisCode": data.get("qrisCode"),
                    "hasImage": bool(data.get("qrisImage"))
                })
            else:
                return Response({
                    "success": False,
                    "error": f"DynaQRIS Error ({res.status_code}): {res.text}"
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "error": f"Gagal terhubung ke server DynaQRIS: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateDynaQRISView(APIView):
    """Generates dynamic QRIS code for a given transaction."""
    permission_classes = [AllowAny]

    def post(self, request):
        amount = request.data.get('amount')
        reference_id = request.data.get('reference_id')
        transaction_type = request.data.get('type')  # 'event', 'ecommerce', 'digital', 'charity'

        if not amount:
            return Response({'error': 'Nominal pembayaran wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.user.id if request.user and request.user.is_authenticated else None
        result = DynaQRISService.generate_dynamic_qris(amount, user_id=user_id, reference_id=reference_id)

        if "error" in result:
            status_code = status.HTTP_429_TOO_MANY_REQUESTS if result.get("code") == "RATE_LIMITED" else status.HTTP_400_BAD_REQUEST
            return Response(result, status=status_code)

        return Response(result)

class CheckDynaQRISStatusView(APIView):
    """Checks and handles payment status updates for DynaQRIS transactions."""
    permission_classes = [AllowAny]

    def get(self, request):
        transaction_type = request.GET.get('type')
        reference_id = request.GET.get('reference_id')

        if not transaction_type or not reference_id:
            return Response({'error': 'Tipe dan ID referensi transaksi wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        status_result = {'status': 'pending'}

        if transaction_type == 'event':
            from events.models import EventRegistration
            reg = EventRegistration.objects.filter(id=reference_id).first()
            if reg:
                status_result = {
                    'status': reg.payment_status, # e.g. 'verified', 'pending', 'rejected'
                    'verified': reg.payment_status in ['verified', 'approved'],
                    'registration_id': reg.id
                }
        elif transaction_type == 'ecommerce':
            from orders.models import Order
            order = Order.objects.filter(id=reference_id).first() or Order.objects.filter(order_id=reference_id).first()
            if order:
                status_result = {
                    'status': order.status,
                    'verified': order.status in ['paid', 'completed', 'shipped', 'delivered'],
                    'order_id': order.id
                }
        elif transaction_type == 'digital':
            from digital_products.models import DigitalOrder
            d_order = DigitalOrder.objects.filter(id=reference_id).first() or DigitalOrder.objects.filter(order_number=reference_id).first()
            if d_order:
                status_result = {
                    'status': d_order.payment_status,
                    'verified': d_order.payment_status == 'completed',
                    'order_number': d_order.order_number
                }
        elif transaction_type == 'charity':
            donation = Donation.objects.filter(id=reference_id).first()
            if donation:
                status_result = {
                    'status': donation.payment_status,
                    'verified': donation.payment_status in ['verified', 'success'],
                    'donation_id': donation.id
                }

        return Response(status_result)

    def post(self, request):
        """Simulate / Verify completion of DynaQRIS payment."""
        transaction_type = request.data.get('type')
        reference_id = request.data.get('reference_id')

        if not transaction_type or not reference_id:
            return Response({'error': 'Tipe dan ID referensi wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        if transaction_type == 'event':
            from events.models import EventRegistration
            reg = EventRegistration.objects.filter(id=reference_id).first()
            if reg:
                reg.payment_status = 'verified'
                reg.status = 'approved'
                reg.save()
                return Response({'success': True, 'message': 'Pembayaran Event berhasil diverifikasi!'})
        elif transaction_type == 'ecommerce':
            from orders.models import Order
            order = Order.objects.filter(id=reference_id).first() or Order.objects.filter(order_id=reference_id).first()
            if order:
                order.status = 'paid'
                order.save()
                return Response({'success': True, 'message': 'Pembayaran Pesanan E-commerce berhasil diverifikasi!'})
        elif transaction_type == 'digital':
            from digital_products.models import DigitalOrder
            d_order = DigitalOrder.objects.filter(id=reference_id).first() or DigitalOrder.objects.filter(order_number=reference_id).first()
            if d_order:
                d_order.payment_status = 'completed'
                d_order.save()
                return Response({'success': True, 'message': 'Pembayaran Produk Digital berhasil diverifikasi!'})
        elif transaction_type == 'charity':
            donation = Donation.objects.filter(id=reference_id).first()
            if donation:
                donation.payment_status = 'verified'
                donation.save()
                return Response({'success': True, 'message': 'Pembayaran Donasi berhasil diverifikasi!'})

        return Response({'error': 'Transaksi tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

class GenerateDonationMidtransTokenView(APIView):
    def post(self, request):
        try:
            data = request.data
            logger.info(f"Request data: {data}")

            try:
                amount = int(data.get('amount'))
            except (TypeError, ValueError):
                return JsonResponse({'error': 'Invalid amount'}, status=400)

            donor_name = data.get('donorName')
            donor_phone = data.get('donorPhone')
            campaign_slug = data.get('campaignSlug')

            if not donor_name or not donor_phone:
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
            try:
                campaign = Campaign.objects.get(slug=campaign_slug)
            except Campaign.DoesNotExist:
                return JsonResponse({'error': 'Campaign not found'}, status=404)

            donation = Donation.objects.create(
                campaign=campaign,
                donor_name=donor_name,
                donor_phone=donor_phone,
                amount=amount,
                payment_method='midtrans',
                payment_status='pending'
            )

            transaction_details = {
                'order_id': f'D{donation.id}-C{campaign.id}',
                'gross_amount': amount,
            }

            customer_details = {
                'first_name': donor_name,
                'phone': donor_phone,
            }

            transaction = snap.create_transaction({
                'transaction_details': transaction_details,
                'customer_details': customer_details,
            })

            return JsonResponse({
                'token': transaction['token'],
                'redirect_url': transaction['redirect_url'],
                'order_id': transaction_details['order_id'],
            })
        except Exception as e:
            logger.error(f"Error generating Midtrans token: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class GenerateOrderMidtransTokenView(APIView):
    def post(self, request):
        try:
            data = request.data
            try:
                total_amount = int(data.get('amount'))
            except (TypeError, ValueError):
                return JsonResponse({'error': 'Invalid amount'}, status=400)

            customer_name = data.get('customerName')
            customer_phone = data.get('customerPhone')
            checkout_number = data.get('checkoutNumber')

            if not customer_name or not customer_phone or not checkout_number:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            user = request.user
            order = Order.objects.create(
                user=user,
                order_id=checkout_number,
                total_amount=total_amount,
                payment_method='midtrans',
                payment_status='pending'
            )

            transaction_details = {
                'order_id': order.order_id,
                'gross_amount': total_amount,
            }

            customer_details = {
                'first_name': customer_name,
                'phone': customer_phone,
            }

            transaction = snap.create_transaction({
                'transaction_details': transaction_details,
                'customer_details': customer_details,
            })

            return JsonResponse({
                'token': transaction['token'],
                'redirect_url': transaction['redirect_url'],
                'order_id': transaction_details['order_id'],
            })
        except Exception as e:
            logger.error(f"Error generating Midtrans token: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
        
class MidtransDonationNotificationView(APIView):
    def post(self, request):
        try:
            data = request.data
            order_id = data.get('order_id')
            transaction_status = data.get('transaction_status')
            fraud_status = data.get('fraud_status')

            donation_id = order_id.split('-')[1]

            donation = Donation.objects.get(id=donation_id)
            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    donation.payment_status = 'success'
            elif transaction_status == 'settlement':
                donation.payment_status = 'success'
            elif transaction_status in ['cancel', 'deny', 'expire']:
                donation.payment_status = 'failed'
            donation.save()

            return JsonResponse({'status': 'ok'})
        except Donation.DoesNotExist:
            logger.error(f"Donation not found for order_id: {order_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error processing Midtrans notification: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class MidtransOrderNotificationView(APIView):
    def post(self, request):
        try:
            data = request.data
            order_id = data.get('order_id')
            transaction_status = data.get('transaction_status')
            fraud_status = data.get('fraud_status')

            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                logger.error(f"Order not found for order_id: {order_id}")
                return JsonResponse({'error': 'Order not found'}, status=404)

            if transaction_status == 'capture':
                if fraud_status == 'accept':
                    order.payment_status = 'success'
            elif transaction_status == 'settlement':
                order.payment_status = 'success'
            elif transaction_status in ['cancel', 'deny', 'expire']:
                order.payment_status = 'failed'
            order.save()

            return JsonResponse({'status': 'ok'})
        except Exception as e:
            logger.error(f"Error processing Midtrans notification: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
        
class CheckDonationPaymentStatusView(APIView):
    def get(self, request):
        try:
            transaction_id = request.GET.get('order_id')
            if not transaction_id:
                return JsonResponse({'error': 'Order ID is required'}, status=400)

            status_response = snap.transactions.status(transaction_id)
            transaction_status = status_response.get('transaction_status')

            donation_id = transaction_id.split('-')[1]

            donation = Donation.objects.get(id=donation_id)
            donation.payment_status = transaction_status
            donation.save()

            return JsonResponse({
                'status': transaction_status,
                'order_id': transaction_id,
                'amount': donation.amount,
                'payment_method': donation.payment_method,
            })
        except Donation.DoesNotExist:
            logger.error(f"Donation not found for order_id: {transaction_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

class CheckOrderPaymentStatusView(APIView):
    def get(self, request):
        try:
            transaction_id = request.GET.get('order_id')
            if not transaction_id:
                return JsonResponse({'error': 'Order ID is required'}, status=400)

            status_response = snap.transactions.status(transaction_id)
            transaction_status = status_response.get('transaction_status')

            order_id = transaction_id.split('-')[1]

            donation = Donation.objects.get(id=order_id)
            donation.payment_status = transaction_status
            donation.save()

            return JsonResponse({
                'status': transaction_status,
                'order_id': transaction_id,
                'amount': donation.amount,
                'payment_method': donation.payment_method,
            })
        except Donation.DoesNotExist:
            logger.error(f"Order not found for order_id: {transaction_id}")
            return JsonResponse({'error': 'Donation not found'}, status=404)
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)