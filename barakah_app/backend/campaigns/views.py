# campaigns/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, F
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
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
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if self.request.user.is_staff:
            queryset = Campaign.objects.all()
        else:
            queryset = Campaign.objects.filter(is_active=True, approval_status='approved')
        
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
        lookup_value = self.kwargs.get('slug') or self.kwargs.get('pk')
        obj = None

        if lookup_value:
            # Try slug first
            obj = queryset.filter(slug=lookup_value).first()
            if not obj and str(lookup_value).isdigit():
                # Then try ID
                obj = queryset.filter(id=lookup_value).first()

        if not obj:
            from django.http import Http404
            raise Http404

        self.check_object_permissions(self.request, obj)
        return obj

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Atomic increment using F expression
        Campaign.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
        # Refresh from DB to get the updated count for serialization
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request):
        """User submits a new campaign for admin approval."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            status_val = 'approved' if request.user.is_staff else 'pending'
            is_active = True if request.user.is_staff else False
            serializer.save(
                created_by=request.user,
                approval_status=status_val,
                is_active=is_active
            )
            return Response(
                {'message': 'Kampanye berhasil diajukan dan menunggu verifikasi admin.', 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_campaigns(self, request):
        """Get campaigns submitted by the current user."""
        campaigns = Campaign.objects.filter(created_by=request.user).order_by('-created_at')
        serializer = self.get_serializer(campaigns, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def pending(self, request):
        """Get all pending campaigns for admin review."""
        campaigns = Campaign.objects.filter(approval_status='pending').order_by('-created_at')
        serializer = self.get_serializer(campaigns, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, slug=None):
        """Admin approves a campaign."""
        campaign = self.get_object()
        campaign.approval_status = 'approved'
        campaign.is_active = True
        campaign.save(update_fields=['approval_status', 'is_active'])
        from barakah_app.utils import send_status_update_email
        send_status_update_email(campaign.created_by, campaign.title, 'approved')
        return Response({'message': 'Kampanye berhasil disetujui.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, slug=None):
        """Admin rejects a campaign with a reason."""
        campaign = self.get_object()
        reason = request.data.get('reason', '')
        campaign.approval_status = 'rejected'
        campaign.rejection_reason = reason
        campaign.save(update_fields=['approval_status', 'rejection_reason'])
        from barakah_app.utils import send_status_update_email
        send_status_update_email(campaign.created_by, campaign.title, 'rejected', reason)
        return Response({'message': 'Kampanye ditolak.'})


class CampaignShareView(APIView):
    def get(self, request, slug):
        campaign = get_object_or_404(Campaign, slug=slug)
        from django.shortcuts import render
        from django.conf import settings
        
        if settings.DEBUG:
            frontend_url = 'http://localhost:3000'
        else:
            # frontend_url = 'https://barakah-economy.com'
            frontend_url = 'https://barakah-economy.com'
        
        thumbnail_url = None
        if campaign.thumbnail:
            img_url = campaign.thumbnail.url
            if img_url.startswith('http'):
                thumbnail_url = img_url
            else:
                import urllib.parse
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