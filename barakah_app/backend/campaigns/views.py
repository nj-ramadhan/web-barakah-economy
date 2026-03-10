# campaigns/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Campaign, CampaignRealization
from .serializers import CampaignSerializer, CampaignRealizationSerializer
from donations.models import Donation

class CampaignRealizationViewSet(viewsets.ModelViewSet):
    queryset = CampaignRealization.objects.all()
    serializer_class = CampaignRealizationSerializer
    authentication_classes = [JWTAuthentication]

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
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Campaign.objects.filter(is_active=True)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

    def get_object(self):
        """Logic Hybrid: Cek Slug dulu, kalau gagal cek ID"""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_value = self.kwargs.get('slug')
        obj = None

        if lookup_value is not None:
            # 1. Coba cari pakai ID jika inputnya angka
            if lookup_value.isdigit():
                obj = queryset.filter(id=lookup_value).first()
            
            # 2. Jika belum ketemu, cari pakai Slug
            if not obj:
                obj = get_object_or_404(queryset, slug=lookup_value)

        self.check_object_permissions(self.request, obj)
        return obj

# CampaignDetailView removed as CampaignViewSet now handles slugs

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