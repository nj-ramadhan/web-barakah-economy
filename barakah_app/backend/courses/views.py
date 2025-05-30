from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from .models import Course, CourseEnrollment, CourseMaterial
from .serializers import CourseSerializer, CourseEnrollmentSerializer, CourseMaterialSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.filter(is_active=True)
    serializer_class = CourseSerializer
    
    def get_queryset(self):
        queryset = Course.objects.filter(is_active=True)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

class CourseDetailViewSet(APIView):
    def get(self, request, slug):
        course = get_object_or_404(Course, slug=slug)
        serializer = CourseSerializer(course)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
class CourseEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CourseEnrollment.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course')
        if CourseEnrollment.objects.filter(user=request.user, course_id=course_id).exists():
            return Response({'detail': 'Already enrolled'}, status=status.HTTP_400_BAD_REQUEST)
        enrollment = CourseEnrollment.objects.create(user=request.user, course_id=course_id, payment_status='pending')
        return Response(CourseEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.payment_status = 'paid'
        enrollment.save()
        return Response({'detail': 'Payment confirmed.'})

class CourseMaterialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseMaterial.objects.all()
    serializer_class = CourseMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

class CoursePaymentConfirmationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, slug):
        course = get_object_or_404(Course, slug=slug)
        enrollment, created = CourseEnrollment.objects.get_or_create(
            course=course,
            user=request.user,
            defaults={'payment_status': 'pending'}
        )
        # If not created, update status to verified
        if not created:
            enrollment.payment_status = 'pending'
        # Save proof file if provided
        if 'proof_file' in request.FILES:
            enrollment.proof_file = request.FILES['proof_file']
        enrollment.save()
        return Response({'detail': 'Payment confirmation received.'}, status=status.HTTP_200_OK)