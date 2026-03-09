from rest_framework import viewsets, permissions
from .models import Partner, Testimonial
from .serializers import PartnerSerializer, TestimonialSerializer

class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer

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
