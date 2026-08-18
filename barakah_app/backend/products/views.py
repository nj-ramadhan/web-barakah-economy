# products/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Product, ShopVoucher
from .serializers import ProductSerializer, ShopVoucherSerializer
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

class ShopVoucherViewSet(viewsets.ModelViewSet):
    serializer_class = ShopVoucherSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'admin':
            return ShopVoucher.objects.all()
        return ShopVoucher.objects.filter(seller=user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

class VoucherValidateView(APIView):
    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Kode voucher diperlukan'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            voucher = ShopVoucher.objects.get(code__iexact=code, is_active=True)
            if voucher.quantity == 0:
                return Response({'error': 'Kuota voucher sudah habis'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ShopVoucherSerializer(voucher)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ShopVoucher.DoesNotExist:
            return Response({'error': 'Voucher tidak valid atau tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)

from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from .permissions import IsOwnerOrAdmin

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    
    def get_permissions(self):
        if self.action in ['like', 'add_testimoni_buyer']:
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve', 'promotion']:
            return [IsAuthenticatedOrReadOnly()]
        if self.action in ['add_testimoni_admin']:
            return [IsAuthenticated()]
        return [IsAuthenticatedOrReadOnly(), IsOwnerOrAdmin()]
    
    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg) or self.kwargs.get('pk') or self.kwargs.get('slug')
        
        if not lookup_value:
            from django.http import Http404
            raise Http404

        # Try ID first if numeric
        if str(lookup_value).isdigit():
            obj = Product.objects.filter(pk=int(lookup_value)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
        
        # Try Slug
        obj = Product.objects.filter(slug__iexact=str(lookup_value)).first()
        if not obj:
            obj = get_object_or_404(Product, slug=lookup_value)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all()

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Dashboard Management View or Detail Actions
        is_detail = self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'like', 'add_testimoni_buyer', 'add_testimoni_admin', 'delete_testimoni', 'promotion']
        if self.request.query_params.get('manage') == 'true' or is_detail:
            if not user.is_authenticated:
                if is_detail: # Public can still retrieve approved products
                    return queryset.filter(status__iexact='approved', is_active=True)
                return queryset.none()
                
            # Superusers, Admins, or Staff see everything
            if user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin':
                return queryset
                
            # Owners see their own (all status)
            if is_detail:
                # For detail, show my own OR approved products
                return queryset.filter(Q(seller=user) | Q(status__iexact='approved', is_active=True)).distinct()
            return queryset.filter(seller=user)

        # Public Marketplace View - Only show approved & active products
        return queryset.filter(status__iexact='approved', is_active=True)


    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        from django.db.models import F
        instance.views_count = F('views_count') + 1
        instance.save(update_fields=['views_count'])
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        product = self.get_object()
        user = request.user
        if product.likes.filter(id=user.id).exists():
            product.likes.remove(user)
            liked = False
        else:
            product.likes.add(user)
            liked = True
        return Response({
            'status': 'success',
            'liked': liked,
            'likes_count': product.likes.count()
        })

    def _ensure_jpeg(self, image_file):
        """Converts any uploaded product image into a standard, optimized RGB JPEG (.jpg)."""
        if not image_file:
            return None
        from PIL import Image
        from django.core.files.uploadedfile import InMemoryUploadedFile
        import io, os

        try:
            with Image.open(image_file) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    bg = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    bg.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = bg
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Resize if excessively large for fast page & social preview load
                img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)

                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85, optimize=True)
                buffer.seek(0)

                base_name = os.path.splitext(image_file.name)[0]
                new_filename = f"{base_name}.jpg"

                return InMemoryUploadedFile(
                    buffer,
                    'ImageField',
                    new_filename,
                    'image/jpeg',
                    buffer.getbuffer().nbytes,
                    None
                )
        except Exception as e:
            print(f"JPEG conversion error: {e}")
            return image_file

    def perform_create(self, serializer):
        user = self.request.user
        role = getattr(user, 'role', '')
        auto_approve = user.is_superuser or user.is_staff or role == 'admin'
        
        thumb = self._ensure_jpeg(self.request.FILES.get('thumbnail'))
        if thumb:
            product = serializer.save(seller=user, thumbnail=thumb, status='approved' if auto_approve else 'pending')
        else:
            product = serializer.save(seller=user, status='approved' if auto_approve else 'pending')

        self._save_variations(product)
        self._save_gallery_images(product)

    def perform_update(self, serializer):
        thumb = self._ensure_jpeg(self.request.FILES.get('thumbnail'))
        if thumb:
            product = serializer.save(thumbnail=thumb)
        else:
            product = serializer.save()
        self._save_variations(product)
        self._save_gallery_images(product)

    def _save_variations(self, product):
        import json
        import uuid
        from .models import ProductVariation
        variations_data = self.request.data.get('variations')
        
        if variations_data:
            try:
                # Handle both JSON string and already-parsed list
                if isinstance(variations_data, str):
                    variations = json.loads(variations_data)
                else:
                    variations = variations_data
                
                # Delete old variations to ensure fresh start (or we could use IDs if frontend sends them)
                product.variations.all().delete()
                
                for i, var in enumerate(variations):
                    if not var.get('name'): continue
                    
                    # Ensure numeric types
                    try:
                        add_price = float(var.get('additional_price', 0) or 0)
                        v_stock = int(var.get('stock', 0) or 0)
                    except (ValueError, TypeError):
                        add_price = 0
                        v_stock = 0

                    unique_sku = f"{product.slug[:20]}-{uuid.uuid4().hex[:6]}-{i}"
                    ProductVariation.objects.create(
                        product=product,
                        sku=unique_sku,
                        name=var.get('name'),
                        additional_price=add_price,
                        stock=v_stock
                    )
                
                # Sync product stock and price range after variation save
                product.sync_variations()
                
            except Exception as e:
                print(f"Error saving variations: {e}")
                import traceback
                traceback.print_exc()

    def _save_gallery_images(self, product):
        from .models import ProductImage
        gallery_images = self.request.FILES.getlist('gallery_images')
        
        if gallery_images:
            for img in gallery_images:
                converted_img = self._ensure_jpeg(img) or img
                ProductImage.objects.create(
                    product=product,
                    image=converted_img
                )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_testimoni_admin(self, request, pk=None, slug=None):
        """Admin manual input of testimonials for social proof."""
        user = request.user
        if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
            return Response({'error': 'Hanya admin yang dapat menginput testimoni secara manual.'}, status=status.HTTP_403_FORBIDDEN)

        product = self.get_object()
        customer = request.data.get('customer') or 'Pelanggan Terverifikasi'
        stars = int(request.data.get('stars', 5))
        description = request.data.get('description', '').strip()
        image_file = request.FILES.get('image')
        created_at_input = request.data.get('created_at')

        if not description:
            return Response({'error': 'Deskripsi / teks testimoni wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        # Compress image if uploaded
        compressed_img = self._compress_image(image_file) if image_file else None

        from .models import Testimoni
        from django.utils.dateparse import parse_datetime

        testimoni = Testimoni.objects.create(
            product=product,
            customer=customer,
            stars=max(1, min(5, stars)),
            description=description,
            image=compressed_img,
            is_admin_entry=True
        )

        if created_at_input:
            dt = parse_datetime(created_at_input)
            if dt:
                testimoni.created_at = dt
                testimoni.save(update_fields=['created_at'])

        from .serializers import TestimoniSerializer
        return Response(TestimoniSerializer(testimoni).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_testimoni_buyer(self, request, pk=None, slug=None):
        """Verified buyer review submission after purchase completion."""
        user = request.user
        product = self.get_object()

        # Check if buyer purchased this product in a completed order
        from orders.models import Order
        has_purchased = Order.objects.filter(
            user=user,
            items__product=product,
            status__in=['Selesai', 'Completed', 'selesai', 'completed', 'delivered', 'Delivered']
        ).exists()

        if not has_purchased and not (user.is_superuser or user.is_staff):
            return Response({
                'error': 'Anda hanya dapat memberikan ulasan pada produk dari pesanan yang telah selesai.'
            }, status=status.HTTP_400_BAD_REQUEST)

        stars = int(request.data.get('stars', 5))
        description = request.data.get('description', '').strip()
        image_file = request.FILES.get('image')

        if not description:
            return Response({'error': 'Ulasan / testimoni wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

        customer_name = getattr(user.profile, 'name_full', None) or user.username
        compressed_img = self._compress_image(image_file) if image_file else None

        from .models import Testimoni
        testimoni = Testimoni.objects.create(
            product=product,
            user=user,
            customer=customer_name,
            stars=max(1, min(5, stars)),
            description=description,
            image=compressed_img,
            is_admin_entry=False
        )

        from .serializers import TestimoniSerializer
        return Response(TestimoniSerializer(testimoni).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='testimonies/(?P<testimoni_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_testimoni(self, request, pk=None, slug=None, testimoni_id=None):
        """Admin or author delete testimonial."""
        user = request.user
        product = self.get_object()
        from .models import Testimoni
        testimoni = get_object_or_404(Testimoni, id=testimoni_id, product=product)

        if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin' or testimoni.user == user):
            return Response({'error': 'Anda tidak memiliki hak untuk menghapus testimoni ini.'}, status=status.HTTP_403_FORBIDDEN)

        testimoni.delete()
        return Response({'message': 'Testimoni berhasil dihapus.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post', 'delete'], permission_classes=[IsAuthenticatedOrReadOnly])
    def promotion(self, request, pk=None, slug=None):
        """Manage promo / campaign for product."""
        product = self.get_object()
        from .models import ProductPromotion
        from .serializers import ProductPromotionSerializer

        if request.method == 'GET':
            promos = product.promotions.all().order_by('-created_at')
            return Response(ProductPromotionSerializer(promos, many=True).data)

        user = request.user
        if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin' or product.seller == user):
            return Response({'error': 'Hanya admin atau pemilik toko yang dapat mengatur promo produk ini.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'DELETE':
            product.promotions.all().delete()
            return Response({'message': 'Promo produk berhasil dinonaktifkan/dihapus.'}, status=status.HTTP_200_OK)

        if request.method == 'POST':
            title = request.data.get('title') or 'Promo Spesial'
            discount_type = request.data.get('discount_type', 'percentage')
            discount_value = float(request.data.get('discount_value', 0) or 0)
            min_quantity = int(request.data.get('min_quantity', 1) or 1)
            is_min_qty_percentage = bool(request.data.get('is_min_qty_percentage', True))
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')

            if not start_date or not end_date:
                return Response({'error': 'Tanggal mulai dan berakhir promo wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

            if discount_value <= 0:
                return Response({'error': 'Nilai diskon harus lebih dari 0.'}, status=status.HTTP_400_BAD_REQUEST)

            product_price = float(product.price or 0)
            if discount_type == 'percentage':
                if discount_value > 100:
                    return Response({'error': 'Diskon persentase maksimal 100%.'}, status=status.HTTP_400_BAD_REQUEST)
            elif discount_type == 'nominal':
                if product_price > 0 and discount_value > product_price:
                    price_formatted = f"Rp {int(product_price):,}".replace(',', '.')
                    return Response({'error': f'Diskon nominal tidak boleh melebihi harga jual produk ({price_formatted}).'}, status=status.HTTP_400_BAD_REQUEST)
            elif discount_type == 'min_qty_discount':
                if is_min_qty_percentage and discount_value > 100:
                    return Response({'error': 'Diskon persentase grosir maksimal 100%.'}, status=status.HTTP_400_BAD_REQUEST)
                elif not is_min_qty_percentage and product_price > 0 and discount_value > product_price:
                    price_formatted = f"Rp {int(product_price):,}".replace(',', '.')
                    return Response({'error': f'Diskon nominal grosir tidak boleh melebihi harga jual produk ({price_formatted}).'}, status=status.HTTP_400_BAD_REQUEST)

            from django.utils.dateparse import parse_datetime
            start_dt = parse_datetime(start_date)
            end_dt = parse_datetime(end_date)

            if not start_dt or not end_dt or end_dt <= start_dt:
                return Response({'error': 'Format tanggal salah atau tanggal berakhir harus lebih besar dari tanggal mulai.'}, status=status.HTTP_400_BAD_REQUEST)

            # Deactivate previous promos
            product.promotions.all().update(is_active=False)

            promo = ProductPromotion.objects.create(
                product=product,
                title=title,
                discount_type=discount_type,
                discount_value=discount_value,
                min_quantity=min_quantity,
                is_min_qty_percentage=is_min_qty_percentage,
                start_date=start_dt,
                end_date=end_dt,
                is_active=True
            )

            return Response(ProductPromotionSerializer(promo).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='transfer-ownership', permission_classes=[IsAuthenticated])
    def transfer_ownership(self, request, pk=None, slug=None):
        """Transfer ownership of a physical product to another registered BAE user via username or email."""
        user = request.user
        product = self.get_object()

        # Check permission: Only owner, superuser, staff, or admin can transfer
        if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin' or product.seller == user):
            return Response({
                'error': 'Hanya pemilik produk atau administrator yang dapat memindahkan kepemilikan produk ini.'
            }, status=status.HTTP_403_FORBIDDEN)

        target_identifier = request.data.get('target_user', '').strip()
        if not target_identifier:
            return Response({
                'error': 'Username atau email pengguna tujuan wajib diisi.'
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Find target user by username or email (case-insensitive)
        target_user = User.objects.filter(
            Q(username__iexact=target_identifier) | Q(email__iexact=target_identifier)
        ).first()

        if not target_user:
            return Response({
                'error': f'Pengguna dengan username/email "{target_identifier}" tidak ditemukan di web BAE.'
            }, status=status.HTTP_404_NOT_FOUND)

        if target_user == product.seller:
            return Response({
                'error': 'Produk ini sudah dimiliki oleh akun tersebut.'
            }, status=status.HTTP_400_BAD_REQUEST)

        previous_owner = product.seller
        previous_owner_name = previous_owner.username if previous_owner else 'Sistem'
        product.seller = target_user
        product.save(update_fields=['seller'])

        # 1. Transfer all related sales orders so order history, notifications, and pending balance move to the new owner
        from orders.models import Order
        transferred_orders = Order.objects.filter(items__product=product)
        transferred_orders_count = transferred_orders.update(seller=target_user)

        # 2. Transfer wallet earnings for completed orders from previous owner to new owner
        from transactions.models import UserWallet, WalletTransaction
        if previous_owner and previous_owner != target_user:
            try:
                prev_wallet = UserWallet.get_or_create_wallet(previous_owner)
                target_wallet = UserWallet.get_or_create_wallet(target_user)

                earning_txs = WalletTransaction.objects.filter(
                    order__in=transferred_orders,
                    wallet=prev_wallet,
                    transaction_type='EARNING'
                )
                total_earning_to_move = sum([tx.amount for tx in earning_txs])

                if total_earning_to_move > 0:
                    prev_wallet.debit(
                        amount=total_earning_to_move,
                        transaction_type='ADJUSTMENT',
                        description=f"Pemindahan saldo penjualan produk '{product.title}' ke @{target_user.username}"
                    )
                    target_wallet.credit(
                        amount=total_earning_to_move,
                        transaction_type='EARNING',
                        description=f"Penerimaan saldo penjualan produk '{product.title}' dari @{previous_owner.username}"
                    )
            except Exception as e:
                logger.error(f"Error transferring wallet earnings: {e}")

        target_name = getattr(target_user.profile, 'name_full', None) or target_user.username

        return Response({
            'success': True,
            'message': f'Kepemilikan produk "{product.title}" beserta {transferred_orders_count} data riwayat pesanan & saldo pending/terbayar berhasil dialihkan kepada {target_name} (@{target_user.username}).',
            'transferred_orders_count': transferred_orders_count,
            'new_owner': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email,
                'name': target_name
            }
        }, status=status.HTTP_200_OK)

    def _compress_image(self, uploaded_file):
        """Compress uploaded review image if large to ensure fast database & storage."""
        if not uploaded_file:
            return None
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import InMemoryUploadedFile
        import sys

        try:
            img = Image.open(uploaded_file)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            max_dim = 1200
            if max(img.size) > max_dim:
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            output = BytesIO()
            img.save(output, format='JPEG', quality=80, optimize=True)
            output.seek(0)
            return InMemoryUploadedFile(
                output, 'ImageField', f"testi_{uploaded_file.name.split('.')[0]}.jpg",
                'image/jpeg', sys.getsizeof(output), None
            )
        except Exception as e:
            print(f"Image compression fallback: {e}")
            return uploaded_file


class ProductDetailView(APIView):
    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
        from django.db.models import F
        product.views_count = F('views_count') + 1
        product.save(update_fields=['views_count'])
        product.refresh_from_db()
        serializer = ProductSerializer(product)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProductShareView(APIView):
    """
    View for rendering server-side HTML with Open Graph tags for social media sharing.
    When accessed by scrapers (WhatsApp, FB, Twitter), renders rich Open Graph preview with thumbnail.
    When accessed by human users, immediately redirects to the frontend product page.
    """
    def get(self, request, slug):
        import re
        slug_clean = str(slug).strip('/')
        product = Product.objects.filter(slug__iexact=slug_clean).first()
        if not product and slug_clean.isdigit():
            product = Product.objects.filter(id=int(slug_clean)).first()
        if not product:
            search_term = slug_clean.replace('-', ' ').strip()
            product = Product.objects.filter(title__icontains=search_term).first()

        # Fallback to digital product if needed
        if not product:
            from digital_products.models import DigitalProduct
            dp = DigitalProduct.objects.filter(slug__iexact=slug_clean).first()
            if dp:
                target_url = f"https://barakah.cloud/digital-products/{dp.slug}"
                thumb = dp.thumbnail.url if dp.thumbnail else 'https://barakah.cloud/images/web-thumbnail.jpg'
                if thumb and not thumb.startswith('http'):
                    thumb = f"https://api.barakah.cloud{thumb}"
                
                clean_desc = re.sub(r'<[^>]*>', '', dp.description or '')[:160].strip()
                price_str = f"Rp {int(dp.price):,}".replace(',', '.') if dp.price else ''
                desc_text = f"Harga: {price_str} | {clean_desc}" if price_str else clean_desc

                product_data = {
                    'title': dp.title,
                    'description': desc_text or f"Beli {dp.title} di Barakah Economy.",
                    'thumbnail_url': thumb,
                }
                from django.shortcuts import render
                return render(request, 'products/product_share.html', {
                    'product': product_data,
                    'target_url': target_url
                })

        if product:
            target_url = f"https://barakah.cloud/produk/{product.slug}"

            # Check for active promotion/campaign
            from django.utils import timezone
            now = timezone.now()
            active_promo = product.promotions.filter(
                is_active=True,
                start_date__lte=now,
                end_date__gte=now
            ).first()

            price_val = float(product.price or 0)
            orig_price_str = f"Rp {int(price_val):,}".replace(',', '.') if price_val > 0 else ''

            # Helper for unicode strikethrough in link preview snippets (e.g. R̶p̶ ̶1̶0̶0̶.̶0̶0̶0̶)
            def to_strikethrough(text):
                return ''.join(c + '\u0336' for c in text)

            price_desc = ''
            if active_promo and price_val > 0:
                disc_val = float(active_promo.discount_value or 0)
                if active_promo.discount_type == 'percentage':
                    discounted_price = max(0, price_val - (price_val * disc_val / 100))
                    disc_label = f"-{int(disc_val)}%"
                elif active_promo.discount_type == 'nominal':
                    discounted_price = max(0, price_val - disc_val)
                    disc_label = f"Hemat Rp {int(disc_val):,}".replace(',', '.')
                else: # min_qty_discount
                    if active_promo.is_min_qty_percentage:
                        discounted_price = max(0, price_val - (price_val * disc_val / 100))
                        disc_label = f"Grosir -{int(disc_val)}%"
                    else:
                        discounted_price = max(0, price_val - disc_val)
                        disc_label = f"Grosir Potongan Rp {int(disc_val):,}".replace(',', '.')

                promo_price_str = f"Rp {int(discounted_price):,}".replace(',', '.')
                strike_orig = to_strikethrough(orig_price_str)
                price_desc = f"🔥 PROMO: {promo_price_str} ({strike_orig} | {disc_label})"
            elif orig_price_str:
                price_desc = f"Harga: {orig_price_str}"

            clean_desc = re.sub(r'<[^>]*>', '', product.description or '')[:160].strip()
            desc_parts = []
            if price_desc:
                desc_parts.append(price_desc)
            if clean_desc:
                desc_parts.append(clean_desc)
            else:
                desc_parts.append(f"Beli {product.title} di Barakah Economy.")

            product_data = {
                'title': product.title,
                'description': " | ".join(desc_parts),
                'thumbnail_url': f"https://api.barakah.cloud/api/products/{product.slug}/og-image/",
                'thumbnail_type': 'image/jpeg',
            }
        else:
            target_url = f"https://barakah.cloud/store"
            product_data = {
                'title': str(slug_clean).replace('-', ' ').title(),
                'description': 'Temukan produk unggulan dan berkualitas dari Barakah Economy.',
                'thumbnail_url': f"https://api.barakah.cloud/api/products/{slug_clean}/og-image/",
                'thumbnail_type': 'image/jpeg',
            }

        from django.shortcuts import render
        return render(request, 'products/product_share.html', {
            'product': product_data,
            'target_url': target_url
        })


class ProductOgImageView(APIView):
    """
    Dynamically generates and serves lightweight (< 200KB) JPEG thumbnails for WhatsApp / Telegram Open Graph.
    WhatsApp rejects thumbnails > 300KB or in non-standard formats (WebP/SVG).
    """
    permission_classes = [AllowAny]

    def get(self, request, slug=None, pk=None):
        from django.http import HttpResponse
        from PIL import Image
        import io, os
        from django.conf import settings

        product = None
        if slug:
            product = Product.objects.filter(slug__iexact=slug).first()
        elif pk:
            product = Product.objects.filter(pk=pk).first()

        # Fallback to digital product if not found
        dp = None
        if not product and slug:
            from digital_products.models import DigitalProduct
            dp = DigitalProduct.objects.filter(slug__iexact=slug).first()

        # Resolve image file on disk
        img_path = None
        if product:
            if product.thumbnail and hasattr(product.thumbnail, 'path') and os.path.exists(product.thumbnail.path):
                img_path = product.thumbnail.path
            elif hasattr(product, 'images') and product.images.exists():
                first_img = product.images.first()
                if first_img and first_img.image and hasattr(first_img.image, 'path') and os.path.exists(first_img.image.path):
                    img_path = first_img.image.path
        elif dp:
            if dp.thumbnail and hasattr(dp.thumbnail, 'path') and os.path.exists(dp.thumbnail.path):
                img_path = dp.thumbnail.path

        if img_path and os.path.exists(img_path):
            try:
                with Image.open(img_path) as img:
                    # Convert to RGB (in case of RGBA, P, WebP, etc.)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        bg = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        bg.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = bg
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')

                    # Resize to max 600x600 maintaining aspect ratio for WhatsApp
                    img.thumbnail((600, 600), Image.Resampling.LANCZOS)

                    buffer = io.BytesIO()
                    img.save(buffer, format='JPEG', quality=82, optimize=True)
                    img_bytes = buffer.getvalue()

                    response = HttpResponse(img_bytes, content_type='image/jpeg')
                    response['Cache-Control'] = 'public, max-age=86400'
                    return response
            except Exception as e:
                pass

        # Fallback to default web-thumbnail.jpg
        default_thumb_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'images', 'web-thumbnail.jpg')
        if os.path.exists(default_thumb_path):
            try:
                with open(default_thumb_path, 'rb') as f:
                    response = HttpResponse(f.read(), content_type='image/jpeg')
                    response['Cache-Control'] = 'public, max-age=86400'
                    return response
            except:
                pass

        # In-memory generated placeholder
        img = Image.new('RGB', (300, 300), color=(5, 150, 105))
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=80)
        return HttpResponse(buffer.getvalue(), content_type='image/jpeg')