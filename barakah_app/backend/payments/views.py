# payments/views.py
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
import re
import decimal
from decimal import Decimal
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
    """Generates dynamic QRIS code for a given transaction and syncs the exact final amount to the database record."""
    permission_classes = [AllowAny]

    def post(self, request):
        amount = request.data.get('amount')
        reference_id = request.data.get('reference_id')
        transaction_type = request.data.get('type')  # 'event', 'ecommerce', 'digital', 'charity', 'ecourse'

        if not amount:
            return Response({'error': 'Nominal pembayaran wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.user.id if request.user and request.user.is_authenticated else None
        add_unique_code = request.data.get('add_unique_code', True)
        if isinstance(add_unique_code, str):
            add_unique_code = add_unique_code.lower() in ['true', '1']

        result = DynaQRISService.generate_dynamic_qris(
            amount, 
            user_id=user_id, 
            reference_id=reference_id, 
            add_unique_code=bool(add_unique_code),
            transaction_type=transaction_type
        )

        if "error" in result:
            # Clean up pending event registration immediately if DynaQRIS generation failed
            if transaction_type == 'event' and reference_id:
                try:
                    from events.models import EventRegistration
                    EventRegistration.objects.filter(id=reference_id, status='pending').delete()
                except Exception as del_err:
                    logger.error(f"Failed to delete pending registration {reference_id} after DynaQRIS error: {del_err}")

            status_code = status.HTTP_429_TOO_MANY_REQUESTS if result.get("code") == "RATE_LIMITED" else status.HTTP_400_BAD_REQUEST
            return Response(result, status=status_code)

        # Synchronize generated final unique amount to the transaction database record so Webhook matches it accurately
        if "amount" in result and reference_id:
            final_amount = Decimal(str(result["amount"]))
            clean_ref = str(reference_id).strip().lstrip('#')
            try:
                if transaction_type == 'ecommerce':
                    from orders.models import Order
                    ord_obj = Order.objects.filter(
                        Q(order_number=clean_ref) | Q(order_number=reference_id) | Q(order_number__iexact=clean_ref)
                    ).first()
                    if not ord_obj and clean_ref.isdigit():
                        ord_obj = Order.objects.filter(id=int(clean_ref)).first()

                    if ord_obj:
                        base_cost = (ord_obj.total_price or Decimal('0')) + (ord_obj.shipping_cost or Decimal('0')) - (ord_obj.voucher_nominal or Decimal('0'))
                        diff = final_amount - base_cost
                        ord_obj.admin_fee = max(Decimal('0'), diff)
                        ord_obj.grand_total = final_amount
                        ord_obj.payment_method = 'dynaqris'
                        ord_obj.save(update_fields=['admin_fee', 'grand_total', 'payment_method'])
                        logger.info(f"Successfully synced Order #{ord_obj.order_number} grand_total to {final_amount} (admin_fee: {ord_obj.admin_fee})")
                elif transaction_type == 'event':
                    from events.models import EventRegistration
                    reg_obj = EventRegistration.objects.filter(id=clean_ref).first() if clean_ref.isdigit() else None
                    if reg_obj:
                        if reg_obj.admin_fee == 0 and final_amount > reg_obj.payment_amount:
                            reg_obj.admin_fee = max(Decimal('0'), final_amount - reg_obj.payment_amount)
                        reg_obj.payment_amount = final_amount
                        reg_obj.save(update_fields=['payment_amount', 'admin_fee'])
                elif transaction_type == 'charity':
                    from donations.models import Donation
                    don_obj = Donation.objects.filter(id=clean_ref).first() if clean_ref.isdigit() else None
                    if don_obj:
                        if don_obj.admin_fee == 0 and final_amount > don_obj.amount:
                            don_obj.admin_fee = max(Decimal('0'), final_amount - don_obj.amount)
                        don_obj.amount = final_amount
                        don_obj.save(update_fields=['amount', 'admin_fee'])
                elif transaction_type == 'digital':
                    from digital_products.models import DigitalOrder
                    dig_obj = DigitalOrder.objects.filter(
                        Q(order_number=clean_ref) | Q(order_number=reference_id)
                    ).first()
                    if not dig_obj and clean_ref.isdigit():
                        dig_obj = DigitalOrder.objects.filter(id=int(clean_ref)).first()
                    if dig_obj:
                        base_val = dig_obj.digital_product.price if dig_obj.digital_product else dig_obj.amount
                        diff = final_amount - Decimal(str(base_val or 0))
                        dig_obj.admin_fee = max(Decimal('0'), diff)
                        dig_obj.amount = final_amount
                        dig_obj.save(update_fields=['admin_fee', 'amount'])
                elif transaction_type in ['ecourse', 'course']:
                    from courses.models import CourseEnrollment
                    crs_obj = CourseEnrollment.objects.filter(
                        Q(order_number=clean_ref) | Q(order_number=reference_id)
                    ).first()
                    if not crs_obj and clean_ref.isdigit():
                        crs_obj = CourseEnrollment.objects.filter(id=int(clean_ref)).first()
                    if crs_obj:
                        base_val = crs_obj.course.price if crs_obj.course else crs_obj.amount
                        diff = final_amount - Decimal(str(base_val or 0))
                        crs_obj.admin_fee = max(Decimal('0'), diff)
                        crs_obj.amount = final_amount
                        crs_obj.save(update_fields=['admin_fee', 'amount'])
            except Exception as sync_err:
                logger.error(f"Failed to synchronize {transaction_type} record with generated amount {final_amount}: {sync_err}")
                logger.error(f"Error syncing final DynaQRIS amount {final_amount} for {transaction_type} #{reference_id}: {sync_err}")

        return Response(result)

def send_donation_receipt(donation):
    """
    Sends automatic Email and WhatsApp receipts to donor upon verified donation.
    Customizes messaging based on charity category (Zakat, Sedekah, Infak, Donasi, etc.) and campaign title.
    """
    if not donation:
        return
        
    category_raw = getattr(donation.campaign, 'category', 'donasi') if donation.campaign else 'donasi'
    category_lower = str(category_raw).lower()
    
    if 'zakat' in category_lower:
        cat_label = 'Zakat'
        doa = 'Semoga Allah melipatgandakan pahala, membersihkan harta, dan membawakan keberkahan bagi Anda dan keluarga. Aamiin.'
    elif 'sedekah' in category_lower:
        cat_label = 'Sedekah'
        doa = 'Semoga sedekah ini menjadi naungan dan pembuka pintu-pintu kebaikan & rezeki bagi Anda. Aamiin.'
    elif 'infak' in category_lower or 'infaq' in category_lower:
        cat_label = 'Infak'
        doa = 'Semoga infak ini menjadi amal jariyah yang terus mengalir pahalanya. Aamiin.'
    elif 'bencana' in category_lower or 'kemanusiaan' in category_lower:
        cat_label = 'Donasi Kemanusiaan'
        doa = 'Terima kasih atas bantuan & kepedulian Anda untuk saudara-saudara kita yang membutuhkan. Semoga Allah membalas kebaikan Anda dengan berlipat ganda. Aamiin.'
    else:
        cat_label = 'Donasi'
        doa = 'Terima kasih atas kepedulian dan kebaikan Anda. Semoga Allah membalas dengan kebaikan yang berlipat ganda. Aamiin.'

    try:
        formatted_amount = f"Rp {int(donation.amount):,}".replace(',', '.')
    except Exception:
        formatted_amount = f"Rp {donation.amount}"

    campaign_title = donation.campaign.title if donation.campaign else 'Program Kebajikan'
    donor_disp_name = 'Hamba Allah' if donation.is_anonymous else (donation.donor_name or 'Donatur')

    # Build Message Text
    msg_text = (
        f"ASSALAMU'ALAIKUM WARAHMATULLAHI WABARAKATUH\n\n"
        f"BUKTI TANDA TERIMA {cat_label.upper()} BERHASIL\n"
        f"----------------------------------------\n"
        f"Yth. {donor_disp_name},\n\n"
        f"Alhamdulillah, pembayaran {cat_label} Anda telah berhasil diterima dan diverifikasi oleh sistem Barakah Economy.\n\n"
        f"Rincian Donasi:\n"
        f"• Program    : {campaign_title}\n"
        f"• Kategori   : {cat_label}\n"
        f"• Nominal    : {formatted_amount}\n"
        f"• Tanggal    : {donation.created_at.strftime('%d-%m-%Y %H:%M') if donation.created_at else timezone.now().strftime('%d-%m-%Y %H:%M')}\n"
        f"• Status     : TERVERIFIKASI / LUNAS\n\n"
        f"{doa}\n\n"
        f"Salam hangat,\n"
        f"Tim Barakah Economy Community"
    )

    # 1. Send WhatsApp if phone available
    if donation.donor_phone:
        try:
            from accounts import whatsapp_service
            phone = str(donation.donor_phone).strip().replace('-', '').replace(' ', '').replace('+', '')
            if phone.startswith('0'):
                phone = '62' + phone[1:]
            whatsapp_service.send_message(phone, msg_text)
            donation.whatsapp_sent = True
            donation.whatsapp_sent_at = timezone.now()
            donation.save(update_fields=['whatsapp_sent', 'whatsapp_sent_at'])
        except Exception as e:
            logger.error(f"Failed to send WA receipt for donation {donation.id}: {e}")

    # 2. Send Email if email available
    if donation.donor_email:
        try:
            from barakah_app.utils import send_email
            subject = f"Bukti Penerimaan {cat_label} - {campaign_title}"
            send_email(
                subject=subject,
                message=msg_text,
                recipient_list=[donation.donor_email],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Failed to send Email receipt for donation {donation.id}: {e}")

class CheckDynaQRISStatusView(APIView):
    """
    Public endpoint to check or verify DynaQRIS payment status.
    GET / POST: Safely checks actual current status from DB.
    POST with simulate=True / action='verify': Explicitly marks transaction as verified (for Admin / Webhook).
    """
    permission_classes = [AllowAny]

    def _extract_params(self, request):
        t_type = request.GET.get('type') or (request.data.get('type') if isinstance(getattr(request, 'data', None), dict) else None)
        ref_id = request.GET.get('reference_id') or (request.data.get('reference_id') if isinstance(getattr(request, 'data', None), dict) else None)
        return t_type, ref_id

    def get(self, request):
        transaction_type, reference_id = self._extract_params(request)

        if not transaction_type:
            return Response({'error': 'Tipe transaksi wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fallback reference_id for ecommerce if missing but user is logged in
        if not reference_id and transaction_type == 'ecommerce' and request.user and request.user.is_authenticated:
            from orders.models import Order
            latest_ord = Order.objects.filter(user=request.user).order_by('-created_at').first()
            if latest_ord:
                reference_id = latest_ord.order_number or latest_ord.id

        if not reference_id:
            return Response({'error': 'ID referensi transaksi wajib diisi.', 'status': 'pending', 'verified': False}, status=status.HTTP_400_BAD_REQUEST)

        status_result = {'status': 'pending', 'verified': False}

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
            order = None
            if str(reference_id).isdigit():
                order = Order.objects.filter(id=int(reference_id)).first()
            if not order:
                order = Order.objects.filter(order_number=reference_id).first()
            if order:
                status_result = {
                    'status': order.status,
                    'verified': (order.status or '').lower() in ['paid', 'proses', 'dikirim', 'selesai', 'completed', 'shipped', 'delivered'],
                    'order_id': order.id,
                    'order_number': order.order_number
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
        elif transaction_type in ['ecourse', 'course']:
            from courses.models import CourseEnrollment
            c_enrollment = None
            if str(reference_id).isdigit():
                c_enrollment = CourseEnrollment.objects.filter(id=int(reference_id)).first()
            else:
                c_enrollment = CourseEnrollment.objects.filter(order_number=reference_id).first()
            if c_enrollment:
                status_result = {
                    'status': c_enrollment.payment_status,
                    'verified': c_enrollment.payment_status in ['paid', 'verified'],
                    'enrollment_id': c_enrollment.id,
                    'order_number': c_enrollment.order_number
                }
        elif transaction_type == 'charity':
            donation = None
            if str(reference_id).isdigit():
                donation = Donation.objects.filter(id=int(reference_id)).first()
            else:
                donation = Donation.objects.filter(campaign__slug=reference_id).order_by('-created_at').first()

            if donation:
                status_result = {
                    'status': donation.payment_status,
                    'verified': donation.payment_status in ['verified', 'success', 'paid'],
                    'donation_id': donation.id
                }
            else:
                status_result = {
                    'status': 'pending',
                    'verified': False
                }

        return Response(status_result)

    def post(self, request):
        """
        Verify completion of DynaQRIS payment.
        Only mutates payment status if 'action' == 'verify' or 'simulate' == True.
        Otherwise delegates to get(request) to safely check current status.
        """
        is_simulate = request.data.get('simulate') is True or request.data.get('action') == 'verify'
        
        if not is_simulate:
            return self.get(request)

        transaction_type, reference_id = self._extract_params(request)

        if not transaction_type or not reference_id:
            return Response({'error': 'Tipe dan ID referensi wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        if transaction_type == 'event':
            from events.models import EventRegistration
            from events.views import EventViewSet
            reg = EventRegistration.objects.filter(id=reference_id).first()
            if reg:
                reg.payment_status = 'verified'
                reg.status = 'approved'
                reg.save()
                try:
                    viewset = EventViewSet()
                    viewset._send_registration_notifications(reg)
                except Exception as e:
                    logger.error(f"Failed to send event notifications upon QRIS verification for reg {reg.id}: {e}")
                return Response({'success': True, 'message': 'Pembayaran Event berhasil diverifikasi!'})
        elif transaction_type == 'ecommerce':
            from orders.models import Order
            order = None
            if str(reference_id).isdigit():
                order = Order.objects.filter(id=int(reference_id)).first()
            if not order:
                order = Order.objects.filter(order_number=reference_id).first()
            if order:
                order.status = 'Paid'
                order.payment_method = 'dynaqris'
                order.save()
                try:
                    from orders.utils import send_order_invoice_to_buyer, send_order_notification_to_seller
                    send_order_invoice_to_buyer(order)
                    send_order_notification_to_seller(order)
                except Exception as e:
                    logger.error(f"Error sending order notifications for {order.order_number}: {e}")
                return Response({'success': True, 'message': 'Pembayaran Pesanan E-commerce berhasil diverifikasi!'})

        elif transaction_type == 'digital':
            from digital_products.models import DigitalOrder
            d_order = DigitalOrder.objects.filter(id=reference_id).first() or DigitalOrder.objects.filter(order_number=reference_id).first()
            if d_order:
                d_order.payment_status = 'completed'
                d_order.save()
                return Response({'success': True, 'message': 'Pembayaran Produk Digital berhasil diverifikasi!'})
        elif transaction_type in ['ecourse', 'course']:
            from courses.models import CourseEnrollment
            c_enrollment = None
            if str(reference_id).isdigit():
                c_enrollment = CourseEnrollment.objects.filter(id=int(reference_id)).first()
            else:
                c_enrollment = CourseEnrollment.objects.filter(order_number=reference_id).first()
            if c_enrollment:
                c_enrollment.payment_status = 'paid'
                c_enrollment.save()
                return Response({'success': True, 'message': 'Pembayaran E-Course berhasil diverifikasi!'})
        elif transaction_type == 'charity':
            donation = None
            if str(reference_id).isdigit():
                donation = Donation.objects.filter(id=int(reference_id)).first()
            else:
                donation = Donation.objects.filter(campaign__slug=reference_id, payment_status='pending').order_by('-created_at').first()
            
            if donation:
                donation.payment_status = 'verified'
                donation.save()
                send_donation_receipt(donation)
                return Response({'success': True, 'message': 'Pembayaran Donasi berhasil diverifikasi!'})
            else:
                return Response({'error': 'Transaksi donasi tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

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

class AndroidListenerHeartbeatView(APIView):
    """
    Heartbeat and Single Device Lock endpoint for BAE Android Notification Listener.
    Ensures only 1 primary Android phone is actively processing notifications.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        setting = PaymentSetting.get_settings()
        secret = (
            request.META.get('HTTP_X_ANDROID_SECRET') or
            request.data.get('secret') or
            request.data.get('secret_token')
        )

        if setting.android_webhook_secret and secret != setting.android_webhook_secret:
            return Response({
                "success": False,
                "status": "unauthorized",
                "error": "Secret token tidak valid."
            }, status=status.HTTP_401_UNAUTHORIZED)

        device_id = request.data.get('device_id') or 'default_device'
        device_name = request.data.get('device_name') or 'Android Device'
        force_claim = request.data.get('force_claim', True)

        now = timezone.now()

        # If current device matches or no device registered or claiming primary lock:
        if not setting.listener_device_id or setting.listener_device_id == device_id or force_claim:
            setting.listener_device_id = device_id
            setting.listener_device_name = device_name
            setting.listener_last_heartbeat = now
            setting.save(update_fields=['listener_device_id', 'listener_device_name', 'listener_last_heartbeat'])

            return Response({
                "success": True,
                "status": "active",
                "is_primary": True,
                "active_device_id": device_id,
                "active_device_name": device_name,
                "last_heartbeat": now.isoformat(),
                "message": "🟢 Terhubung 24/7 ke Server Barakah (Perangkat Utama Aktif)"
            }, status=status.HTTP_200_OK)
        else:
            # Device mismatch and not claiming
            return Response({
                "success": False,
                "status": "disconnected",
                "is_primary": False,
                "active_device_id": setting.listener_device_id,
                "active_device_name": setting.listener_device_name,
                "message": f"🔴 Sesi dialihkan ke HP lain ({setting.listener_device_name or 'Perangkat Lain'})."
            }, status=status.HTTP_200_OK)


class AndroidNotificationWebhookView(APIView):
    """
    Webhook listener for Android Notification Forwarder apps (MacroDroid, Tasker, Notification Forwarder, etc.)
    and Barakah Android Notif Listener.
    Parses bank / e-wallet transaction push notifications and auto-verifies matching pending payments.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        GET endpoint to verify webhook availability, check status, and retrieve test instructions.
        """
        setting = PaymentSetting.get_settings()
        return Response({
            "status": "active" if setting.android_webhook_enabled else "disabled",
            "webhook_enabled": setting.android_webhook_enabled,
            "service": "Barakah Android Notification Listener Webhook",
            "active_device": setting.listener_device_name or "Belum Terhubung",
            "last_heartbeat": setting.listener_last_heartbeat.isoformat() if setting.listener_last_heartbeat else None,
            "message": "Endpoint aktif dan siap menerima push notifikasi m-Banking & E-Wallet.",
            "supported_apps": [
                "BSI Mobile", "BCA Mobile", "Mandiri Livin", "BRImo", "BNI Mobile",
                "DANA", "GoPay", "OVO", "ShopeePay", "SeaBank", "Blu by BCA", "Jenius", "Lainnya"
            ],
            "sample_payload": {
                "package": "id.co.bankbsi.mobile",
                "title": "BSI Mobile Uang Masuk",
                "text": "Transfer masuk sebesar Rp 50.000 dari Fulan",
                "secret": setting.android_webhook_secret or "barakah_android_notif_secret_123"
            }
        }, status=status.HTTP_200_OK)

    def post(self, request):
        setting = PaymentSetting.get_settings()
        if not setting.android_webhook_enabled:
            return Response({
                "success": False,
                "error": "Webhook Android sedang dinonaktifkan di Pengaturan Pembayaran."
            }, status=status.HTTP_403_FORBIDDEN)

        # Verify secret token (from Headers, Body, or Query Params)
        secret_header = (
            request.META.get('HTTP_X_ANDROID_SECRET') or
            request.META.get('HTTP_SECRET') or
            request.META.get('HTTP_X_SECRET') or
            (request.data.get('secret') if isinstance(getattr(request, 'data', None), dict) else None) or
            (request.data.get('secret_token') if isinstance(getattr(request, 'data', None), dict) else None) or
            request.GET.get('secret')
        )
        if setting.android_webhook_secret and secret_header != setting.android_webhook_secret:
            logger.warning(f"Unauthorized Android Notification Webhook attempt with secret: {secret_header}")
            return Response({
                "success": False,
                "error": "Secret token tidak valid. Periksa pengaturan secret token Anda."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Update last heartbeat on webhook reception
        device_id = request.data.get('device_id') if isinstance(getattr(request, 'data', None), dict) else None
        if device_id:
            setting.listener_device_id = device_id
        setting.listener_last_heartbeat = timezone.now()
        setting.save(update_fields=['listener_device_id', 'listener_last_heartbeat'])

        # Extract text / message from payload (exclude secret fields from text content)
        if isinstance(request.data, dict):
            text_parts = [
                str(v) for k, v in request.data.items()
                if v and isinstance(v, (str, int, float)) and k not in ['secret', 'secret_token', 'package', 'device_id', 'device_name']
            ]
            payload_text = " ".join(text_parts)
        else:
            payload_text = str(request.data)

        logger.info(f"Received Android Notification Webhook payload: {payload_text}")

        import re
        import decimal

        def parse_amount_str(s):
            """Parses raw matched number string taking into account Indonesian formatting."""
            s = s.strip()
            if not s:
                return None
            try:
                # Handle Indonesian thousand separators vs decimals
                if ',' in s and '.' in s:
                    # e.g. "20.008,00" -> 20008
                    s_clean = s.replace('.', '').replace(',', '.')
                elif '.' in s and ',' not in s:
                    parts = s.split('.')
                    if len(parts) == 2 and len(parts[1]) in [1, 2]:
                        # e.g. "121.00" -> 121
                        s_clean = parts[0]
                    elif len(parts) == 2 and len(parts[1]) == 3:
                        # e.g. "20.008" -> 20008
                        s_clean = s.replace('.', '')
                    elif len(parts) > 2:
                        # e.g. "1.000.000" -> 1000000
                        s_clean = s.replace('.', '')
                    else:
                        s_clean = s.replace('.', '')
                elif ',' in s and '.' not in s:
                    parts = s.split(',')
                    if len(parts) == 2 and len(parts[1]) in [1, 2]:
                        # e.g. "121,00" -> 121
                        s_clean = parts[0]
                    else:
                        s_clean = s.replace(',', '')
                else:
                    s_clean = s

                val = decimal.Decimal(s_clean)
                if val > 0:
                    return val
            except Exception:
                pass
            return None

        extracted_amounts = []

        # Priority 1: Numbers preceded by currency symbols or keywords (Rp, IDR, Sebesar, Nominal, Total, Nilai, Jumlah)
        currency_matches = re.findall(
            r'(?:rp\.?|idr|sebesar|nominal|total|nilai|jumlah)\s*:?\s*(\d+(?:[\.\,]\d+)*)',
            payload_text,
            re.IGNORECASE
        )
        for m in currency_matches:
            val = parse_amount_str(m)
            if val and val not in extracted_amounts:
                extracted_amounts.append(val)

        # Priority 2: Standard formatted numbers with dots (e.g. 50.000, 100.000, 1.500.000)
        formatted_matches = re.findall(r'\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)\b', payload_text)
        for m in formatted_matches:
            val = parse_amount_str(m)
            if val and val not in extracted_amounts:
                extracted_amounts.append(val)

        # Priority 3: Any standalone numbers >= 1000 and <= 100,000,000 (excluding potential 10+ digit account numbers)
        if not extracted_amounts:
            general_matches = re.findall(r'\b(\d{3,9}(?:[\.\,]\d+)?)\b', payload_text)
            for m in general_matches:
                val = parse_amount_str(m)
                if val and val not in extracted_amounts:
                    extracted_amounts.append(val)

        if not extracted_amounts:
            return Response({
                "success": False,
                "matched": False,
                "extracted_amounts": [],
                "message": "Tidak ada nominal angka transfer yang terdeteksi dalam notifikasi."
            }, status=status.HTTP_200_OK)

        from events.models import EventRegistration
        from donations.models import Donation
        from orders.models import Order
        from digital_products.models import DigitalOrder
        from courses.models import CourseEnrollment

        # Standard Payment Gateway Active Window: Only match transactions created within timeout
        timeout_mins = max(15, getattr(setting, 'payment_timeout_minutes', 15) or 15)
        recent_cutoff = timezone.now() - timedelta(minutes=timeout_mins)
        recent_event_cutoff = timezone.now() - timedelta(hours=2)

        for amt in extracted_amounts:
            # 1. Strictly match active E-Commerce Order by grand_total (including admin/service fee & unique code)
            order = Order.objects.filter(
                created_at__gte=recent_cutoff,
                status__in=['pending', 'Pending', 'waiting_payment', 'unpaid'],
                grand_total=amt
            ).order_by('-created_at').first()
            
            if order:
                order.status = 'paid'
                order.save()
                try:
                    from orders.utils import send_order_invoice_to_buyer, send_order_notification_to_seller, send_order_email_notifications
                    send_order_invoice_to_buyer(order)
                    send_order_notification_to_seller(order)
                    send_order_email_notifications(order)
                except Exception as e:
                    logger.error(f"Failed to send order notifications on webhook match for {order.order_number}: {e}")
                return Response({
                    "success": True,
                    "matched": True,
                    "type": "ecommerce",
                    "reference_id": order.id,
                    "order_number": order.order_number or str(order.id),
                    "amount": float(order.grand_total if order.grand_total else amt),
                    "extracted_amounts": [float(a) for a in extracted_amounts],
                    "message": f"Pesanan E-commerce #{order.order_number or order.id} (Rp {float(order.grand_total):,.0f}) berhasil diverifikasi otomatis via Webhook!"
                })

            # 2. Search recent active Digital Product Order with matching amount
            d_order = DigitalOrder.objects.filter(
                created_at__gte=recent_cutoff,
                amount=amt,
                payment_status='pending'
            ).order_by('-created_at').first()
            if d_order:
                d_order.payment_status = 'verified'
                d_order.save()
                try:
                    from digital_products.views import DigitalProductViewSet
                    DigitalProductViewSet()._send_digital_product_email(d_order)
                except Exception as e:
                    logger.error(f"Failed to send digital product email for order {d_order.id}: {e}")
                return Response({
                    "success": True,
                    "matched": True,
                    "type": "digital",
                    "reference_id": d_order.id,
                    "order_number": d_order.order_number,
                    "amount": float(amt),
                    "extracted_amounts": [float(a) for a in extracted_amounts],
                    "message": f"Pesanan Produk Digital #{d_order.order_number} berhasil diverifikasi otomatis via Webhook!"
                })

            # 3. Search recent active Course Enrollment with matching amount
            c_enrollment = CourseEnrollment.objects.filter(
                enrolled_at__gte=recent_cutoff,
                amount=amt,
                payment_status='pending'
            ).order_by('-id').first()
            if c_enrollment:
                c_enrollment.payment_status = 'paid'
                c_enrollment.save()
                return Response({
                    "success": True,
                    "matched": True,
                    "type": "ecourse",
                    "reference_id": c_enrollment.id,
                    "order_number": c_enrollment.order_number,
                    "amount": float(amt),
                    "extracted_amounts": [float(a) for a in extracted_amounts],
                    "message": f"Pendaftaran E-Course #{c_enrollment.order_number or c_enrollment.id} berhasil diverifikasi otomatis via Webhook!"
                })

            # 4. Search recent active Event Registration with matching payment_amount (within 2-hour window)
            reg = EventRegistration.objects.filter(
                created_at__gte=recent_event_cutoff,
                payment_amount=amt
            ).filter(
                status__in=['pending', 'unpaid']
            ).order_by('-created_at').first()

            if not reg:
                # Also try matching registrations with payment_status='pending'
                reg = EventRegistration.objects.filter(
                    created_at__gte=recent_event_cutoff,
                    payment_amount=amt,
                    payment_status__in=['pending', 'unpaid', '']
                ).order_by('-created_at').first()

            if reg:
                reg.payment_status = 'verified'
                reg.status = 'approved'
                reg.save()
                try:
                    from events.views import EventViewSet
                    EventViewSet()._send_registration_notifications(reg)
                except Exception as e:
                    logger.error(f"Failed to send event notifications for reg {reg.id}: {e}")
                return Response({
                    "success": True,
                    "matched": True,
                    "type": "event",
                    "reference_id": reg.id,
                    "amount": float(amt),
                    "extracted_amounts": [float(a) for a in extracted_amounts],
                    "message": f"Pendaftaran Event #{reg.id} ({reg.guest_name or 'Peserta'}) berhasil diverifikasi otomatis via Webhook!"
                })

            # 5. Search recent active Donation with matching amount
            donation = Donation.objects.filter(
                created_at__gte=recent_cutoff,
                amount=amt,
                payment_status='pending'
            ).order_by('-created_at').first()
            if donation:
                donation.payment_status = 'verified'
                donation.save()
                try:
                    send_donation_receipt(donation)
                except Exception as e:
                    logger.error(f"Failed to send donation receipt for {donation.id}: {e}")
                return Response({
                    "success": True,
                    "matched": True,
                    "type": "charity",
                    "reference_id": donation.id,
                    "amount": float(amt),
                    "extracted_amounts": [float(a) for a in extracted_amounts],
                    "message": f"Donasi #{donation.id} ({donation.donor_name or 'Donatur'}) berhasil diverifikasi otomatis via Webhook!"
                })

        return Response({
            "success": True,
            "matched": False,
            "extracted_amounts": [float(a) for a in extracted_amounts],
            "message": f"Notifikasi berhasil dibaca. Nominal terdeteksi: {', '.join(['Rp ' + f'{int(a):,}'.replace(',', '.') for a in extracted_amounts])}. Namun tidak ditemukan transaksi pending dengan nominal tersebut."
        }, status=status.HTTP_200_OK)