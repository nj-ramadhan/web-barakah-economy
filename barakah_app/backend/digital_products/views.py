# digital_products/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import DigitalProduct, DigitalOrder, WithdrawalRequest
from .serializers import (
    DigitalProductSerializer,
    DigitalProductPublicSerializer,
    DigitalOrderSerializer,
    DigitalOrderCreateSerializer,
    WithdrawalRequestSerializer,
)
from django.db.models import Sum, Q, DecimalField
from decimal import Decimal
from courses.models import CourseEnrollment
import logging

logger = logging.getLogger(__name__)


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.views import APIView
from django.shortcuts import render, get_object_or_404
from accounts.models import User
from profiles.models import Profile

class SellerShareView(APIView):
    """
    View for rendering server-side HTML with Open Graph tags for seller profile sharing.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        profile = get_object_or_404(Profile, user=user)
        
        # Build store name
        store_name = profile.name_full or username
        if not store_name.lower().startswith("toko"):
            store_name = f"Toko {store_name}"
            
        # Build target URL (the actual frontend profile page)
        # Force production domain if not in debug, or use current host
        host = request.get_host()
        if 'localhost' not in host and '127.0.0.1' not in host:
            host = 'barakah-economy.com'
            
        target_url = f"https://{host}/digital_produk/{username}"
        
        return render(request, 'digital_products/seller_share.html', {
            'profile': profile,
            'store_name': store_name,
            'username': username,
            'target_url': target_url
        })

class DigitalProductViewSet(viewsets.ModelViewSet):
    """
    Public: list & retrieve active products.
    Authenticated: CRUD own products via /my-products/.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    serializer_class = DigitalProductPublicSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        # Public list: only global active products
        if self.action == 'list':
            return DigitalProduct.objects.filter(is_active=True, visibility='global')
        # Other actions (like retrieve/detail): all active products
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

    @action(detail=False, methods=['get'], url_path='public-profile', permission_classes=[permissions.AllowAny])
    def public_profile(self, request):
        username = request.query_params.get('username')
        if not username:
            return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from accounts.models import User
            from profiles.models import Profile
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)
            
            # Show all active products for the specific user (including exclusive)
            products = DigitalProduct.objects.filter(user=user, is_active=True)
            
            from profiles.serializers import ProfileSerializer  # Assuming it exists
            # Fallback if ProfileSerializer is not handy, we can use a basic dict or specific fields
            profile_data = {
                'name_full': profile.name_full,
                'picture': profile.picture.url if profile.picture else None,
                'shop_thumbnail': profile.shop_thumbnail.url if profile.shop_thumbnail else None,
                'shop_description': profile.shop_description,
            }
            
            product_serializer = DigitalProductPublicSerializer(products, many=True)
            
            return Response({
                'profile': profile_data,
                'products': product_serializer.data
            })
        except (User.DoesNotExist, Profile.DoesNotExist):
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='popular-sellers', permission_classes=[permissions.AllowAny])
    def popular_sellers(self, request):
        try:
            from profiles.models import Profile
            # Sellers who have active digital products and a shop description
            seller_ids = DigitalProduct.objects.filter(is_active=True).values_list('user_id', flat=True).distinct()
            profiles = Profile.objects.filter(user_id__in=seller_ids).exclude(shop_description='').select_related('user')[:10]
            
            data = []
            for p in profiles:
                data.append({
                    'username': p.user.username,
                    'name': p.name_full or p.user.username,
                    'shop_thumbnail': request.build_absolute_uri(p.shop_thumbnail.url) if p.shop_thumbnail else None,
                    'shop_description': p.shop_description
                })
            return Response(data)
        except Exception as e:
            logger.exception(f"Error in popular_sellers: {e}")
            return Response([], status=status.HTTP_200_OK)

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

    @action(detail=False, methods=['get'], url_path='my-purchases')
    def my_purchases(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        orders = DigitalOrder.objects.filter(buyer=request.user, payment_status='verified')
        serializer = DigitalOrderSerializer(orders, many=True)
        return Response(serializer.data)

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

        # Set product owner
        order.product_owner = order.digital_product.user
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


class WithdrawalViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WithdrawalRequestSerializer

    def get_queryset(self):
        try:
            return WithdrawalRequest.objects.filter(user=self.request.user)
        except Exception:
            return WithdrawalRequest.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.exception(f"Error listing withdrawals for user {request.user.id}: {e}")
            return Response([])

    def create(self, request, *args, **kwargs):
        # Calculate balance
        try:
            total_sales = DigitalOrder.objects.filter(
                product_owner=request.user,
                payment_status='verified'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Add Course sales
            total_course_sales = CourseEnrollment.objects.filter(
                course__instructor=request.user,
                payment_status='verified'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            total_sales += total_course_sales
        except Exception as e:
            logger.error(f"Error calculating total sales: {e}")
            total_sales = Decimal('0')

        try:
            total_withdrawn = WithdrawalRequest.objects.filter(
                user=request.user,
                status__in=['pending', 'approved']
            ).aggregate(total=Sum('total_deduction'))['total'] or Decimal('0')
        except Exception:
            total_withdrawn = Decimal('0')

        available_balance = total_sales - total_withdrawn

        try:
            amount = Decimal(request.data.get('amount', '0'))
            donation = Decimal(request.data.get('donation_amount', '0'))
            bank_name = request.data.get('bank_name', '').upper()
            
            # Admin fee logic
            admin_fee = Decimal('0')
            if bank_name not in ['BSI', 'GOPAY']:
                admin_fee = Decimal('6500')
            
            total_deduction = amount + donation + admin_fee

            if total_deduction > available_balance:
                return Response({'error': 'Saldo tidak mencukupi'}, status=status.HTTP_400_BAD_REQUEST)
            
            if amount <= 0:
                return Response({'error': 'Nominal penarikan harus lebih dari 0'}, status=status.HTTP_400_BAD_REQUEST)

            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                serializer.save(
                    user=request.user,
                    admin_fee=admin_fee,
                    total_deduction=total_deduction
                )
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        try:
            total_digital_sales = DigitalOrder.objects.filter(
                product_owner=request.user,
                payment_status='verified'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            total_course_sales = CourseEnrollment.objects.filter(
                course__instructor=request.user,
                payment_status='verified'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            total_sales = total_digital_sales + total_course_sales
        except Exception:
            total_sales = Decimal('0')

        try:
            total_withdrawn = WithdrawalRequest.objects.filter(
                user=request.user,
                status__in=['pending', 'approved']
            ).aggregate(total=Sum('total_deduction'))['total'] or Decimal('0')
        except Exception:
            total_withdrawn = Decimal('0')

        return Response({
            'total_sales': total_sales,
            'total_digital_sales': total_digital_sales,
            'total_course_sales': total_course_sales,
            'total_withdrawn': total_withdrawn,
            'available_balance': total_sales - total_withdrawn
        })
