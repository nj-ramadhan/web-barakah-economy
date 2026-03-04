# digital_products/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import DigitalProduct, DigitalOrder
from .serializers import (
    DigitalProductSerializer,
    DigitalProductPublicSerializer,
    DigitalOrderSerializer,
    DigitalOrderCreateSerializer,
)
import logging

logger = logging.getLogger(__name__)


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication

class DigitalProductViewSet(viewsets.ModelViewSet):
    """
    Public: list & retrieve active products.
    Authenticated: CRUD own products via /my-products/.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    serializer_class = DigitalProductPublicSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return DigitalProduct.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get', 'post'], url_path='my-products')
    def my_products(self, request):
        try:
            if request.method == 'GET':
                products = DigitalProduct.objects.filter(user=request.user)
                serializer = DigitalProductSerializer(products, many=True)
                return Response(serializer.data)
            elif request.method == 'POST':
                serializer = DigitalProductSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save(user=request.user)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error in my_products action: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get', 'put', 'patch', 'delete'], url_path='my-products/(?P<product_id>[^/.]+)')
    def my_product_detail(self, request, product_id=None):
        try:
            try:
                product = DigitalProduct.objects.get(id=product_id, user=request.user)
            except (DigitalProduct.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

            if request.method == 'GET':
                serializer = DigitalProductSerializer(product)
                return Response(serializer.data)
            elif request.method in ['PUT', 'PATCH']:
                partial = request.method == 'PATCH'
                serializer = DigitalProductSerializer(product, data=request.data, partial=partial)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            elif request.method == 'DELETE':
                product.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.exception(f"Error in my_product_detail action: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DigitalOrderViewSet(viewsets.ModelViewSet):
    """
    Create order: no auth required.
    Upload proof: no auth required (by order_number).
    """
    authentication_classes = [JWTAuthentication]
    serializer_class = DigitalOrderSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return DigitalOrder.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = DigitalOrderCreateSerializer(data=request.data)
        if serializer.is_valid():
            order = serializer.save()
            # If user is authenticated, link buyer
            if request.user and request.user.is_authenticated:
                order.buyer = request.user
                order.save()
            return Response(DigitalOrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='status/(?P<order_number>[^/.]+)')
    def status(self, request, order_number=None):
        try:
            order = DigitalOrder.objects.get(order_number=order_number)
            return Response(DigitalOrderSerializer(order).data)
        except DigitalOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='upload-proof/(?P<order_number>[^/.]+)')
    def upload_proof(self, request, order_number=None):
        try:
            order = DigitalOrder.objects.get(order_number=order_number)
        except DigitalOrder.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        proof_file = request.FILES.get('payment_proof')
        if not proof_file:
            return Response({'error': 'No proof file provided'}, status=status.HTTP_400_BAD_REQUEST)

        order.payment_proof = proof_file
        order.save()

        # TODO: Add OCR verification logic here (similar to donation OCR)
        # For now, we auto-verify and send email
        order.payment_status = 'verified'
        order.ocr_verified = True
        order.save()

        # Send digital product link via email
        self._send_digital_product_email(order)

        return Response({
            'message': 'Bukti pembayaran berhasil diupload dan diverifikasi',
            'order': DigitalOrderSerializer(order).data
        })

    def _send_digital_product_email(self, order):
        try:
            from .models import EmailSettings
            from django.core.mail import EmailMessage
            from django.core.mail.backends.smtp import EmailBackend

            email_settings = EmailSettings.get_settings()
            if not email_settings.email_host_user or not email_settings.email_host_password:
                logger.warning(f'Email settings not configured. Skipping email for order {order.order_number}')
                return

            # Create SMTP backend with settings from DB
            backend = EmailBackend(
                host=email_settings.email_host,
                port=email_settings.email_port,
                username=email_settings.email_host_user,
                password=email_settings.email_host_password,
                use_tls=email_settings.email_use_tls,
                fail_silently=False,
            )

            subject = f'Produk Digital Anda - {order.digital_product.title}'
            message = (
                f'Assalamu\'alaikum {order.buyer_name},\n\n'
                f'Terima kasih telah membeli produk digital di Barakah Economy.\n\n'
                f'Detail Pesanan:\n'
                f'- Order: {order.order_number}\n'
                f'- Produk: {order.digital_product.title}\n'
                f'- Harga: Rp {order.amount:,.0f}\n\n'
                f'Silakan akses produk digital Anda melalui link berikut:\n'
                f'{order.digital_product.digital_link}\n\n'
                f'Jazakallahu khairan,\n'
                f'Tim Barakah Economy'
            )

            from_email = f'{email_settings.sender_name} <{email_settings.email_host_user}>'

            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=from_email,
                to=[order.buyer_email],
                connection=backend,
            )
            email.send()

            order.email_sent = True
            order.email_sent_at = timezone.now()
            order.save()
            logger.info(f'Email sent to {order.buyer_email} for order {order.order_number}')
        except Exception as e:
            logger.error(f'Failed to send email for order {order.order_number}: {e}')

    @action(detail=False, methods=['get'], url_path='my-orders')
    def my_orders(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        orders = DigitalOrder.objects.filter(buyer=request.user)
        serializer = DigitalOrderSerializer(orders, many=True)
        return Response(serializer.data)
