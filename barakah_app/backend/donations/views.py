# donations/views.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets
from django.db.models import Q
from django.shortcuts import get_object_or_404
from campaigns.models import Campaign
from .models import Donation, DonationWaqafItem
from .serializers import DonationSerializer
import logging
import json
from decimal import Decimal

logger = logging.getLogger('donations')


def process_waqaf_completion(donation):
    """
    Handles stock reduction and automatic 5-star testimonial creation
    when a Waqaf donation is processed.
    """
    if donation.donation_type != 'waqaf' or donation.is_stock_deducted:
        return

    try:
        from products.models import Testimoni, Product
        from reviews.models import Review

        for item in donation.waqaf_items.select_related('product').all():
            product = item.product
            qty = item.quantity
            if product:
                # 1. Decrease product stock
                if product.stock >= qty:
                    product.stock -= qty
                else:
                    product.stock = 0
                product.save(update_fields=['stock'])

                # 2. Automatically create 5-star Testimoni
                customer_name = donation.donor_name or (donation.donor.username if donation.donor else 'Donatur Waqaf')
                unit_label = product.unit or 'unit'
                description_text = f"Diwakafkan {qty} {unit_label}"

                Testimoni.objects.create(
                    product=product,
                    user=donation.donor,
                    customer=customer_name,
                    stars=5,
                    description=description_text,
                    is_admin_entry=False
                )

                # 3. Automatically create Review if donor is a registered user
                if donation.donor:
                    Review.objects.create(
                        product=product,
                        user=donation.donor,
                        rating=5,
                        comment=description_text
                    )

        donation.is_stock_deducted = True
        donation.save(update_fields=['is_stock_deducted'])
        logger.info(f"Waqaf stock reduction and testimoni successfully processed for Donation {donation.id}")
    except Exception as e:
        logger.error(f"Error processing waqaf completion for Donation {donation.id}: {str(e)}", exc_info=True)


class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.filter(payment_status='pending')
    serializer_class = DonationSerializer
    
    def get_queryset(self):
        queryset = Donation.objects.filter(payment_status='pending')
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

class DonationView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure this is added

    def get(self, request):
        user = request.user
        donation_items = Donation.objects.filter(donor=user)
        serializer = DonationSerializer(donation_items, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        user = request.user
        campaign_id = request.data.get('campaign_id')
        campaign = get_object_or_404(Campaign, id=campaign_id)

        wishlist_item, created = Donation.objects.get_or_create(user=user, campaign=campaign)
        if created:
            serializer = DonationSerializer(wishlist_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({'message': 'Campaign already in wishlist'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        campaign_id = request.data.get('campaign_id')
        wishlist_item = get_object_or_404(Donation, user=user, campaign_id=campaign_id)
        wishlist_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class CampaignDonationsView(APIView):
    def get(self, request, slug):
        try:
            logger.info(f"Fetching donations for campaign: {slug}")

            # Get the campaign
            campaign = get_object_or_404(Campaign, slug=slug)
            logger.info(f"Campaign found: {campaign.title}")

            # Filter only verified donations (or waqaf donations)
            donations = Donation.objects.filter(
                campaign=campaign,
                payment_status='verified'
            ).prefetch_related('waqaf_items', 'waqaf_items__product').order_by('-created_at')
            logger.info(f"Found {donations.count()} verified donations")

            serializer = DonationSerializer(donations, many=True, context={'request': request})
            data = serializer.data
            for item in data:
                if item.get('is_anonymous') and item.get('donation_type') != 'waqaf':
                    item['donor_name'] = 'Hamba Allah'
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching donations: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class UpdateDonationView(APIView):
    def post(self, request, donation_id):
        try:
            amount = request.data.get('amount')
            donor_name = request.data.get('donor_name')
            source_bank = request.data.get('source_bank')
            source_account = request.data.get('source_account')
            transfer_date = request.data.get('transfer_date')
            proof_file = request.FILES.get('proof_file')

            donation = get_object_or_404(Donation, id=donation_id)

            donation.amount = amount
            if donor_name:
                donation.donor_name = donor_name
            donation.source_bank = source_bank
            donation.source_account = source_account
            donation.transfer_date = transfer_date
            donation.payment_status = 'verified'

            if proof_file:
                donation.proof_file = proof_file
            if request.data.get('message'):
                donation.message = request.data.get('message')

            donation.save()

            if donation.donation_type == 'waqaf':
                process_waqaf_completion(donation)

            return Response({
                'status': 'success',
                'message': 'Donation updated successfully',
                'donation_id': donation.id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateDonationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, campaign_slug):
        try:
            logger.info(f"Incoming request data: {request.data}")
            auth_header = request.headers.get('Authorization')

            jwt_authenticator = JWTAuthentication()
            authenticated_user = None

            if auth_header and auth_header.startswith('Bearer '):
                try:
                    validated_token = jwt_authenticator.get_validated_token(auth_header.split(' ')[1])
                    authenticated_user = jwt_authenticator.get_user(validated_token)
                except Exception as e:
                    logger.error(f"JWT authentication failed: {str(e)}")

            campaign = get_object_or_404(Campaign, slug=campaign_slug)

            donation_type = request.data.get('donation_type', 'donation')
            amount = request.data.get('amount')
            admin_fee = request.data.get('admin_fee', 0)
            try:
                admin_fee = Decimal(str(admin_fee or 0))
            except:
                admin_fee = Decimal('0')

            donor_name = (request.data.get('donor_name') or '').strip()
            donor_phone = (request.data.get('donor_phone') or '').strip()
            donor_email = (request.data.get('donor_email') or '').strip()
            payment_method = request.data.get('payment_method')
            source_bank = request.data.get('source_bank')
            source_account = request.data.get('source_account')
            transfer_date = request.data.get('transfer_date')
            proof_file = request.FILES.get('proof_file')
            message = request.data.get('message', '')

            # Parse waqaf items if provided
            waqaf_items_data = request.data.get('waqaf_items')
            if isinstance(waqaf_items_data, str):
                try:
                    waqaf_items_data = json.loads(waqaf_items_data)
                except Exception:
                    waqaf_items_data = []

            is_waqaf = (donation_type == 'waqaf') or bool(waqaf_items_data)
            if is_waqaf:
                donation_type = 'waqaf'
                # Mandatory Real Biodata for Waqaf (no anonymous / Hamba Allah)
                if not donor_name or donor_name.lower() in ['hamba allah', 'anonim', 'anonymous']:
                    return Response({
                        'error': 'Untuk program waqaf, biodata asli (nama lengkap) wajib diisi dan tidak dapat disamarkan.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if not donor_phone:
                    return Response({
                        'error': 'Nomor telepon / WhatsApp wajib diisi untuk waqaf.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if not donor_email or '@' not in donor_email:
                    return Response({
                        'error': 'Alamat email valid wajib diisi untuk waqaf.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            donor = authenticated_user if authenticated_user else None
            raw_anon = request.data.get('is_anonymous', False)
            is_anon = False if is_waqaf else (str(raw_anon).strip().lower() in ['true', '1', 'yes'])

            # If waqaf, calculate accurate amount from items if needed
            calculated_waqaf_total = Decimal('0')
            resolved_items = []
            if is_waqaf and waqaf_items_data:
                from products.models import Product
                for it in waqaf_items_data:
                    p_id = it.get('product_id') or it.get('id')
                    qty = int(it.get('quantity') or it.get('qty') or 1)
                    if p_id and qty > 0:
                        prod = Product.objects.filter(id=p_id).first()
                        if prod:
                            unit_price = Decimal(str(it.get('price') or prod.price))
                            item_subtotal = unit_price * qty
                            calculated_waqaf_total += item_subtotal
                            resolved_items.append({
                                'product': prod,
                                'quantity': qty,
                                'price_per_unit': unit_price,
                                'subtotal': item_subtotal
                            })

                if calculated_waqaf_total > 0:
                    amount = calculated_waqaf_total + admin_fee

            # Create a new donation
            donation = Donation.objects.create(
                campaign=campaign,
                amount=amount,
                admin_fee=admin_fee,
                donor_name=donor_name,
                donor_phone=donor_phone,
                donor_email=donor_email,
                is_anonymous=is_anon,
                payment_method=payment_method,
                source_bank=source_bank,
                source_account=source_account,
                transfer_date=transfer_date,
                message=message,
                donation_type=donation_type,
                payment_status='pending',
                donor=donor
            )

            # Create Waqaf Items records
            for res_it in resolved_items:
                DonationWaqafItem.objects.create(
                    donation=donation,
                    product=res_it['product'],
                    quantity=res_it['quantity'],
                    price_per_unit=res_it['price_per_unit'],
                    subtotal=res_it['subtotal']
                )

            # In waqaf donations, process stock reduction immediately upon waqaf order creation
            if is_waqaf:
                process_waqaf_completion(donation)

            if proof_file:
                donation.proof_file = proof_file
                donation.save()

            return Response({
                'status': 'success',
                'message': 'Donation created successfully',
                'donation_id': donation.id,
                'donation_type': donation.donation_type
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating donation: {str(e)}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CancelDonationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, donation_id):
        try:
            donation = Donation.objects.filter(id=donation_id).first()
            if donation:
                if donation.payment_status == 'pending' and not donation.proof_file:
                    donation.delete()
                    return Response({'status': 'deleted', 'message': 'Unpaid pending donation removed.'}, status=status.HTTP_200_OK)
                return Response({'status': 'kept', 'message': 'Donation is already processed or has proof.'}, status=status.HTTP_200_OK)
            return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, donation_id):
        return self.post(request, donation_id)

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'admin' or request.user.username == 'admin')

class AdminDonationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = DonationSerializer
    queryset = Donation.objects.all().order_by('-created_at')

    def get_queryset(self):
        user = self.request.user
        if user.role != 'admin' and user.username != 'admin':
            return Donation.objects.none()
        
        queryset = Donation.objects.all().order_by('-created_at')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                # Only show pending donations that have uploaded proof_file waiting for admin verification
                queryset = queryset.filter(payment_status='pending').exclude(proof_file='').exclude(proof_file__isnull=True)
            else:
                queryset = queryset.filter(payment_status=status_filter)
        else:
            # Default "Semua Status": only show paid/verified, rejected, or pending WITH proof_file.
            # Exclude abandoned unpaid pending attempts without proof!
            queryset = queryset.filter(
                Q(payment_status__in=['verified', 'rejected']) |
                (Q(payment_status='pending') & ~Q(proof_file='') & Q(proof_file__isnull=False))
            )
            
        campaign_slug = self.request.query_params.get('campaign_slug')
        if campaign_slug:
            queryset = queryset.filter(campaign__slug=campaign_slug)
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(donor_name__icontains=search) |
                Q(donor_phone__icontains=search) |
                Q(donor_email__icontains=search) |
                Q(campaign__title__icontains=search)
            )
            
        return queryset

    def perform_create(self, serializer):
        # Admin manual inputs are auto-verified
        donation = serializer.save(payment_status='verified')
        if donation.donation_type == 'waqaf':
            process_waqaf_completion(donation)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        donation = self.get_object()
        donation.payment_status = 'verified'
        donation.save()
        if donation.donation_type == 'waqaf':
            process_waqaf_completion(donation)
        return Response({'status': 'verified'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        donation = self.get_object()
        donation.payment_status = 'rejected'
        donation.save()
        return Response({'status': 'rejected'})

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="data_donatur.csv"'
        
        # Add BOM for Excel
        response.write(u'\ufeff'.encode('utf8'))
        
        writer = csv.writer(response, delimiter=';')
        writer.writerow([
            'ID', 'Tanggal', 'Kampanye', 'Nama Donatur', 'WhatsApp', 
            'Email', 'Pesan / Doa', 'Nominal', 'Metode', 'Status', 'Bukti Transfer'
        ])
        
        for d in queryset:
            created_at = d.created_at.strftime('%Y-%m-%d %H:%M')
            proof_url = ""
            if d.proof_file:
                proof_url = request.build_absolute_uri(d.proof_file.url)
            
            writer.writerow([
                d.id, created_at, d.campaign.title, d.donor_name, d.donor_phone,
                d.donor_email, d.message or '', d.amount, d.payment_method, d.payment_status, proof_url
            ])
            
        return response
