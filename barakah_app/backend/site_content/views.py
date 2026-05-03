from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Partner, Testimonial, Activity, AboutUs, AboutUsLegalDocument, Personnel, PersonnelSocialMedia
from .serializers import PartnerSerializer, TestimonialSerializer, ActivitySerializer, AboutUsSerializer, AboutUsLegalDocumentSerializer, PersonnelSerializer, PersonnelSocialMediaSerializer

class PersonnelViewSet(viewsets.ModelViewSet):
    queryset = Personnel.objects.all()
    serializer_class = PersonnelSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class PersonnelSocialMediaViewSet(viewsets.ModelViewSet):
    queryset = PersonnelSocialMedia.objects.all()
    serializer_class = PersonnelSocialMediaSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class AboutUsViewSet(viewsets.ModelViewSet):
    queryset = AboutUs.objects.all()
    serializer_class = AboutUsSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class AboutUsLegalDocumentViewSet(viewsets.ModelViewSet):
    queryset = AboutUsLegalDocument.objects.all()
    serializer_class = AboutUsLegalDocumentSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Testimonial.objects.all()
        return Testimonial.objects.filter(is_approved=True)

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            # Check if user already has a testimonial
            if Testimonial.objects.filter(user=self.request.user).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError("You have already submitted a testimonial.")
            serializer.save(user=self.request.user, is_approved=False)
        else:
            serializer.save(is_approved=True)

    @action(detail=False, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated])
    def my_testimonial(self, request):
        if request.method == 'GET':
            testimonial = Testimonial.objects.filter(user=request.user).first()
            if not testimonial:
                return response.Response({}, status=status.HTTP_200_OK)
            serializer = self.get_serializer(testimonial)
            return response.Response(serializer.data)
        
        elif request.method == 'POST':
            testimonial = Testimonial.objects.filter(user=request.user).first()
            if testimonial:
                serializer = self.get_serializer(testimonial, data=request.data, partial=True)
            else:
                serializer = self.get_serializer(data=request.data)
            
            serializer.is_valid(raise_exception=True)
            # Re-approve only if it's admin, or set to False if user edits
            is_approved = request.user.is_staff
            serializer.save(user=request.user, is_approved=is_approved)
            return response.Response(serializer.data)

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        from django.db.models import F
        instance.view_count = F('view_count') + 1
        instance.save(update_fields=['view_count'])
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return response.Response(serializer.data)

class ActivityShareView(viewsets.ViewSet):
    """
    View for rendering server-side HTML with Open Graph tags for activity sharing.
    """
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, pk=None):
        from django.shortcuts import render, get_object_or_404
        from django.conf import settings
        
        activity = get_object_or_404(Activity, pk=pk)

        # Determine frontend URL based on environment
        if settings.DEBUG:
            frontend_url = 'http://localhost:3000'
        else:
            # frontend_url = 'https://barakah-economy.com'
            frontend_url = settings.FRONTEND_URL

        return render(request, 'site_content/activity_share.html', {
            'activity': activity,
            'frontend_url': frontend_url
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from products.models import Product
from campaigns.models import Campaign
from digital_products.models import WithdrawalRequest
from events.models import Event
from donations.models import Donation

class ManagementStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # We only count items that need attention from admin/staff
        stats = {
            'admin_sinergy': Product.objects.filter(status='pending').count(),
            'campaign_approval': Campaign.objects.filter(approval_status='pending').count(),
            'withdrawals': WithdrawalRequest.objects.filter(status='pending').count(),
            'testimonials': Testimonial.objects.filter(is_approved=False).count(),
            'admin_events': Event.objects.filter(status='pending').count(),
            'pending_donations': Donation.objects.filter(payment_status='pending').count(),
        }
        return Response(stats)
