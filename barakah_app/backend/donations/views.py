# donations/views.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets
from django.db.models import Q
from django.shortcuts import get_object_or_404
from campaigns.models import Campaign
from .models import Donation
from .serializers import DonationSerializer
import logging
logger = logging.getLogger('donations')

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
            logger.info(f"Fetching donations for campaign: {slug}")  # Log campaign_slug

            # Get the campaign
            campaign = get_object_or_404(Campaign, slug=slug)
            logger.info(f"Campaign found: {campaign.title}")  # Log campaign title

            # Filter only verified donations
            donations = Donation.objects.filter(
                campaign=campaign,
                payment_status='verified'  # Only include verified donations
            )
            logger.info(f"Found {donations.count()} verified donations")  # Log the number of donations

            # Serialize the donations
            serializer = DonationSerializer(donations, many=True, context={'request': request})

            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching donations: {str(e)}", exc_info=True)  # Log the full error with traceback
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class UpdateDonationView(APIView):
    def post(self, request, donation_id):  # Accept donation_id as a parameter
        try:
            logger.info(f"Donation ID: {donation_id}")
            logger.info(f"Request data: {request.data}")
            logger.info(f"Request files: {request.FILES}")
            # Extract data from the request
            amount = request.data.get('amount')
            donor_name = request.data.get('donor_name')
            source_bank = request.data.get('source_bank')
            source_account = request.data.get('source_account')
            transfer_date = request.data.get('transfer_date')
            proof_file = request.FILES.get('proof_file')

            # Find the donation
            donation = get_object_or_404(Donation, id=donation_id)

            # Update donation details
            donation.amount = amount
            donation.donor_name = donor_name
            donation.source_bank = source_bank
            donation.source_account = source_account
            donation.transfer_date = transfer_date
            donation.payment_status = 'verified'

            if proof_file:
                donation.proof_file = proof_file

            donation.save()

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
    permission_classes = [AllowAny]  # Allow both authenticated and unauthenticated users

    def post(self, request, campaign_slug):
        try:
            logger.info(f"Incoming request data: {request.data}")  # Log request data
            logger.info(f"Incoming files: {request.FILES}")  # Log uploaded files
            # Log the Authorization header
            auth_header = request.headers.get('Authorization')
            logger.info(f"Authorization header: {auth_header}")

            # Authenticate the user using JWT
            jwt_authenticator = JWTAuthentication()
            authenticated_user = None

            if auth_header and auth_header.startswith('Bearer '):
                try:
                    # Decode the JWT token
                    validated_token = jwt_authenticator.get_validated_token(auth_header.split(' ')[1])
                    authenticated_user = jwt_authenticator.get_user(validated_token)
                    logger.info(f"Authenticated user from JWT: {authenticated_user}")
                except Exception as e:
                    logger.error(f"JWT authentication failed: {str(e)}")
            # Fetch the campaign using the slug
            campaign = get_object_or_404(Campaign, slug=campaign_slug)

            # Log the authenticated user (for debugging)
            logger.info(f"Authenticated user: {authenticated_user}")
            logger.info(f"User is authenticated: {authenticated_user is not None}")

            # Extract data from the request
            amount = request.data.get('amount')
            donor_name = request.data.get('donor_name')
            donor_phone = request.data.get('donor_phone')
            donor_email = request.data.get('donor_email')
            payment_method = request.data.get('payment_method')
            source_bank = request.data.get('source_bank')
            source_account = request.data.get('source_account')
            transfer_date = request.data.get('transfer_date')
            proof_file = request.FILES.get('proof_file')

            # Check if the user is authenticated
            donor = authenticated_user if authenticated_user else None

            # Create a new donation
            donation = Donation.objects.create(
                campaign=campaign,
                amount=amount,
                donor_name=donor_name,
                donor_phone=donor_phone,
                donor_email=donor_email,
                payment_method=payment_method,
                source_bank=source_bank,
                source_account=source_account,
                transfer_date=transfer_date,
                payment_status='pending',  # Set initial status as pending
                donor=donor  # Associate the donation with the logged-in user (if any)
            )

            if proof_file:
                donation.proof_file = proof_file
                donation.save()
                logger.debug(f"Proof of payment uploaded: {donation.proof_file.url}")

            logger.debug(f"Donation created: {donation.id}")  # Log the donation

            return Response({
                'status': 'success',
                'message': 'Donation created successfully',
                'donation_id': donation.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating donation: {str(e)}")  # Log the error
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminDonationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DonationSerializer
    queryset = Donation.objects.all().order_by('-created_at')

    def get_queryset(self):
        user = self.request.user
        if user.role != 'admin' and user.username != 'admin':
            return Donation.objects.none()
        
        queryset = Donation.objects.all().order_by('-created_at')
        
        campaign_slug = self.request.query_params.get('campaign_slug')
        if campaign_slug:
            queryset = queryset.filter(campaign__slug=campaign_slug)
            
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(payment_status=status_filter)
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(donor_name__icontains=search) |
                Q(donor_phone__icontains=search) |
                Q(donor_email__icontains=search) |
                Q(campaign__title__icontains=search)
            )
            
        return queryset

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        donation = self.get_object()
        donation.payment_status = 'verified'
        donation.save()
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
            'Email', 'Nominal', 'Metode', 'Status', 'Bukti Transfer'
        ])
        
        for d in queryset:
            created_at = d.created_at.strftime('%Y-%m-%d %H:%M')
            proof_url = ""
            if d.proof_file:
                proof_url = request.build_absolute_uri(d.proof_file.url)
            
            writer.writerow([
                d.id, created_at, d.campaign.title, d.donor_name, d.donor_phone,
                d.donor_email, d.amount, d.payment_method, d.payment_status, proof_url
            ])
            
        return response
