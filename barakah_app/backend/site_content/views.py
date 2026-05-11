from django.db import models
from rest_framework import viewsets, permissions, status, response
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Partner, Testimonial, Activity, AboutUs, AboutUsLegalDocument, Personnel, PersonnelSocialMedia, Announcement, HeroBanner
from .serializers import (
    PartnerSerializer, TestimonialSerializer, ActivitySerializer, AboutUsSerializer, 
    AboutUsLegalDocumentSerializer, PersonnelSerializer, PersonnelSocialMediaSerializer, 
    AnnouncementSerializer, HeroBannerSerializer
)

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()
        qs = Announcement.objects.filter(is_active=True).order_by('-created_at')
        
        # Only apply schedule filter for 'list' action (frontend popup)
        # For admin (staff), show all for management purposes
        if not self.request.user.is_staff or self.action == 'list':
            qs = qs.filter(
                (models.Q(start_at__isnull=True) | models.Q(start_at__lte=now)) &
                (models.Q(end_at__isnull=True) | models.Q(end_at__gte=now))
            )
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

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

class HeroBannerViewSet(viewsets.ModelViewSet):
    queryset = HeroBanner.objects.all()
    serializer_class = HeroBannerSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = HeroBanner.objects.all()
        if self.action == 'list' and not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs.order_by('order', '-created_at')

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
from meetings.models import Meeting

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

class ActivityCalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.role == 'admin'):
             return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        start_param = request.query_params.get('start')
        end_param = request.query_params.get('end')

        from django.db.models import Count

        # Fetch Events with participant counts
        # Include 'draft' for internal monitoring
        events_qs = Event.objects.filter(status__in=['approved', 'ongoing', 'completed', 'pending', 'draft']).annotate(
            reg_count=Count('registrations')
        )
        if start_param:
            events_qs = events_qs.filter(start_date__gte=start_param)
        if end_param:
            events_qs = events_qs.filter(start_date__lte=end_param)
            
        event_data = [{
            'id': f"event-{e.id}",
            'title': (f"[INTERNAL] {e.title}" if e.visibility == 'private' else 
                      (f"[{e.status.upper()}] {e.title}" if e.status in ['pending', 'draft'] else e.title)),
            'type': 'event',
            'category': e.category or 'Umum',
            'start': e.start_date.isoformat(),
            'end': (e.end_date or e.start_date).isoformat(),
            'time_str': e.start_date.strftime("%H:%M"),
            'participants_count': e.reg_count,
            'location': e.location,
            'organizer': e.organizer_name,
            'capacity': e.capacity,
            'status': e.status,
            'visibility': e.visibility,
            'color': '#7C3AED' if e.visibility == 'private' else ('#F59E0B' if e.status in ['pending', 'draft'] else '#4F46E5'), # Purple for internal, Amber for pending, Indigo for public
            'url': f"/event/{e.slug}"
        } for e in events_qs]

        # Fetch Campaigns with donation counts
        # Include 'pending' for internal monitoring
        campaigns_qs = Campaign.objects.filter(approval_status__in=['approved', 'pending']).annotate(
            don_count=Count('donations')
        )
        if start_param:
            campaigns_qs = campaigns_qs.filter(created_at__gte=start_param)
        if end_param:
            campaigns_qs = campaigns_qs.filter(created_at__lte=end_param)
            
        campaign_data = [{
            'id': f"campaign-{c.id}",
            'title': f"[PENDING] {c.title}" if c.approval_status == 'pending' else f"[Charity] {c.title}",
            'type': 'campaign',
            'category': c.get_category_display(),
            'start': c.created_at.isoformat(),
            'end': (c.deadline or c.created_at).isoformat(),
            'time_str': c.created_at.strftime("%H:%M"),
            'participants_count': c.don_count,
            'target_amount': float(c.target_amount),
            'current_amount': float(c.current_amount),
            'status': c.approval_status,
            'color': '#F59E0B' if c.approval_status == 'pending' else '#EF4444', # Amber for internal, Red for public
            'url': f"/campaign/{c.slug}"
        } for c in campaigns_qs]

        # Fetch Meetings (Internal Agenda)
        meetings_qs = Meeting.objects.all().annotate(
            part_count=Count('participants')
        )
        if start_param:
            meetings_qs = meetings_qs.filter(start_date__gte=start_param)
        if end_param:
            meetings_qs = meetings_qs.filter(start_date__lte=end_param)
            
        meeting_data = [{
            'id': f"meeting-{m.id}",
            'title': f"[AGENDA] {m.title}",
            'type': 'meeting',
            'category': 'Internal',
            'start': m.start_date.isoformat(),
            'end': (m.end_date or m.start_date).isoformat(),
            'time_str': m.start_date.strftime("%H:%M"),
            'participants_count': m.part_count,
            'location': m.location,
            'status': 'verified',
            'color': '#7C3AED', # Purple
            'url': f"/meeting/{m.slug}"
        } for m in meetings_qs]

        return Response(event_data + campaign_data + meeting_data)
