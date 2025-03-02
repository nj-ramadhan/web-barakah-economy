# campaigns/views.py
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Campaign
from .serializers import CampaignSerializer
    
class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.filter(is_active=True)  # Add this line
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
    
class UpdateDonationView(APIView):
    def post(self, request, slug):
        try:
            donation = Campaign.objects.get(id=slug)
            amount = request.data.get('amount', 0)
            donation.current_amount += amount
            donation.save()
            return Response({'message': 'Donation updated successfully'}, status=status.HTTP_200_OK)
        except Campaign.DoesNotExist:
            return Response({'error': 'Campaign not found'}, status=status.HTTP_404_NOT_FOUND)      