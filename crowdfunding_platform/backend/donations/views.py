# donations/views.py
from rest_framework.permissions import IsAuthenticated
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
logger = logging.getLogger(__name__)

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

class CampaignDonationsView(APIView):
    def get(self, request, campaign_slug):
        try:
            logger.info(f"Fetching donations for campaign: {campaign_slug}")  # Log campaign_slug

            # Get the campaign
            campaign = get_object_or_404(Campaign, id=campaign_slug)
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
            donation.payment_status = 'confirmed'

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
    def post(self, request, campaign_slug):
        try:
            permission_classes = [IsAuthenticated]
            logger.info(f"Incoming request data: {request.data}")  # Log request data
            logger.info(f"Incoming files: {request.FILES}")  # Log uploaded files

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

            # Find the campaign
            campaign = get_object_or_404(Campaign, id=campaign_slug)

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
                payment_status='pending'  # Set initial status as pending
            )

            if proof_file:
                donation.proof_file = proof_file
                donation.save()

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