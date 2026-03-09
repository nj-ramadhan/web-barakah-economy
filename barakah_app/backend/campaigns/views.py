# campaigns/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Campaign, CampaignRealization
from .serializers import CampaignSerializer, CampaignRealizationSerializer
from donations.models import Donation

class CampaignRealizationViewSet(viewsets.ModelViewSet):
    queryset = CampaignRealization.objects.all()
    serializer_class = CampaignRealizationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def list(self, request, *args, **kwargs):
        campaign_slug = request.query_params.get('campaign_slug')
        if not campaign_slug:
            return Response({"error": "campaign_slug is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        campaign = get_object_or_404(Campaign, slug=campaign_slug)
        
        # Check if user is admin or donor
        is_donor = Donation.objects.filter(
            donor=request.user, 
            campaign=campaign, 
            payment_status='verified'
        ).exists()
        
        if not request.user.is_staff and not is_donor:
            return Response({"error": "Hanya donatur yang dapat melihat realisasi."}, status=status.HTTP_403_FORBIDDEN)
            
        realizations = self.queryset.filter(campaign=campaign)
        serializer = self.get_serializer(realizations, many=True)
        return Response(serializer.data)
    
class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.filter(is_active=True)
    serializer_class = CampaignSerializer
    
    def get_queryset(self):
        queryset = Campaign.objects.filter(is_active=True)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

class CampaignDetailView(APIView):
    def get(self, request, slug):
        campaign = get_object_or_404(Campaign, slug=slug)
        serializer = CampaignSerializer(campaign)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CampaignShareView(APIView):
    """
    View for rendering server-side HTML with Open Graph tags for social media sharing.
    """
    def get(self, request, slug):
        campaign = get_object_or_404(Campaign, slug=slug)
        # We render a standard Django template here, not a DRF Response
        from django.shortcuts import render
        from django.conf import settings
        
        # Determine frontend URL based on environment
        if settings.DEBUG:
            frontend_url = 'http://localhost:3000'
        else:
            frontend_url = 'https://barakah-economy.com'
        
        # Build absolute thumbnail URL
        thumbnail_url = None
        if campaign.thumbnail:
            img_url = campaign.thumbnail.url
            if img_url.startswith('http'):
                # Already a full URL (e.g. cloud storage)
                thumbnail_url = img_url
            else:
                # Force using the frontend domain to avoid localhost/proxy HTTP leaks
                import urllib.parse
                # URL encode the path to handle spaces or special characters safely
                encoded_path = urllib.parse.quote(img_url, safe='/:')
                if encoded_path.startswith('/'):
                    thumbnail_url = f"{frontend_url}{encoded_path}"
                else:
                    thumbnail_url = f"{frontend_url}/{encoded_path}"
            
        return render(request, 'campaigns/campaign_share.html', {
            'campaign': campaign,
            'frontend_url': frontend_url,
            'thumbnail_url': thumbnail_url,
        })