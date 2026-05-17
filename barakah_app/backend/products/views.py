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

from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from .permissions import IsOwnerOrAdmin

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrAdmin]
    
    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg) or self.kwargs.get('pk') or self.kwargs.get('slug')
        
        if not lookup_value:
            from django.http import Http404
            raise Http404

        # Try ID first if numeric
        if str(lookup_value).isdigit():
            obj = queryset.filter(pk=lookup_value).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
        
        # Try Slug
        obj = get_object_or_404(queryset, slug=lookup_value)
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
        is_detail = self.action in ['retrieve', 'update', 'partial_update', 'destroy']
        if self.request.query_params.get('manage') == 'true' or is_detail:
            if not user.is_authenticated:
                if is_detail: # Public can still retrieve approved products
                    return queryset.filter(status='approved', is_active=True)
                return queryset.none()
                
            # Superusers see everything
            if user.is_superuser:
                return queryset
                
            # Owners see their own (all status)
            if is_detail:
                # For detail, show my own OR approved products
                return queryset.filter(Q(seller=user) | Q(status='approved', is_active=True)).distinct()
            return queryset.filter(seller=user)

        # Public Marketplace View - Only show approved & active products
        return queryset.filter(status='approved', is_active=True)


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

    def perform_create(self, serializer):
        product = serializer.save(seller=self.request.user, status='pending')
        self._save_variations(product)
        self._save_gallery_images(product)

    def perform_update(self, serializer):
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
            # If we want to replace images on update, we could delete old ones
            # But for simplicity, we'll just add new ones or handle it via a separate delete endpoint
            # product.images.all().delete() 
            
            for img in gallery_images:
                ProductImage.objects.create(
                    product=product,
                    image=img
                )

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
    Includes logic for dummy/cloaked links without querying the actual product database.
    """
    def get(self, request, slug):
        ref = request.query_params.get('ref', None) # Get 'ref' parameter if it exists
        
        # Build query string
        query_string = f"?ref={ref}" if ref else ""
        
        # Specific logic for bae-cookies (Cloaked Link)
        if slug == 'barakah-cookies':
            target_url = f"https://barakah-cookies.hwofficial.com/{query_string}"
            # Dummy product data for the preview
            product_data = {
                'title': 'Barakah Cookies',
                'description': 'Kue Kering Premium persembahan Barakah Economy. Cek detail dan variasinya sekarang!',
                # 'thumbnail_url': 'https://barakah-economy.com/images/Barakah-Cookies.jpg',
                'thumbnail_url': 'https://barakah.cloud/images/Barakah-Cookies.jpg',
                'thumbnail_type': 'image/jpeg',
            }
        else:
            # Standard logic if you still want other products to point to your DB, 
            # Or if you want ALL to be dummy links, we just default to hwofficial
            target_url = f"https://barakah-cookies.hwofficial.com/{query_string}"
            product_data = {
                'title': 'Barakah Cookies',
                'description': 'Temukan produk unggulan dan berkualitas dari Barakah Economy.',
                # 'thumbnail_url': 'https://barakah-economy.com/images/Barakah-Cookies.jpg',
                'thumbnail_url': 'https://barakah.cloud/images/Barakah-Cookies.jpg',
                'thumbnail_type': 'image/jpeg',
            }
            
        from django.shortcuts import render
        return render(request, 'products/product_share.html', {
            'product': product_data,
            'target_url': target_url
        })