# products/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Product, ShopVoucher
from .serializers import ProductSerializer, ShopVoucherSerializer
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

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all()

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # For unauthenticated or standard users, only show approved & active
        if not user.is_authenticated:
            return queryset.filter(status='approved', is_active=True)

        # If admin, can see all or filter by a specific query
        if user.role == 'admin':
            return queryset

        # Standard users see approved products globally, plus their own products
        return queryset.filter(Q(status='approved', is_active=True) | Q(seller=user))

    def perform_create(self, serializer):
        product = serializer.save(seller=self.request.user, status='pending')
        self._save_variations(product)

    def perform_update(self, serializer):
        product = serializer.save()
        self._save_variations(product)

    def _save_variations(self, product):
        import json
        from .models import ProductVariation
        variations_data = self.request.data.get('variations')
        if variations_data:
            try:
                if isinstance(variations_data, str):
                    variations = json.loads(variations_data)
                else:
                    variations = variations_data
                
                product.variations.all().delete()
                for var in variations:
                    ProductVariation.objects.create(
                        product=product,
                        name=var.get('name'),
                        additional_price=var.get('additional_price', 0),
                        stock=var.get('stock', 0)
                    )
            except Exception as e:
                print(f"Error saving variations: {e}")

class ProductDetailView(APIView):
    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
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
                'thumbnail_url': 'https://barakah-economy.com/images/Barakah-Cookies.jpg',
                'thumbnail_type': 'image/jpeg',
            }
        else:
            # Standard logic if you still want other products to point to your DB, 
            # Or if you want ALL to be dummy links, we just default to hwofficial
            target_url = f"https://barakah-cookies.hwofficial.com/{query_string}"
            product_data = {
                'title': 'Barakah Cookies',
                'description': 'Temukan produk unggulan dan berkualitas dari Barakah Economy.',
                'thumbnail_url': 'https://barakah-economy.com/images/Barakah-Cookies.jpg',
                'thumbnail_type': 'image/jpeg',
            }
            
        from django.shortcuts import render
        return render(request, 'products/product_share.html', {
            'product': product_data,
            'target_url': target_url
        })