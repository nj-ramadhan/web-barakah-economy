from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress
from .serializers import CourseSerializer, CourseEnrollmentSerializer, CourseMaterialSerializer, UserCourseProgressSerializer

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.action == 'my_courses':
            return Course.objects.filter(instructor=self.request.user)
        
        queryset = Course.objects.filter(is_active=True)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        courses = self.get_queryset()
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)

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

class CourseMaterialViewSet(viewsets.ModelViewSet):
    queryset = CourseMaterial.objects.all()
    serializer_class = CourseMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        course_id = self.request.query_params.get('course_id')
        if course_id:
            return CourseMaterial.objects.filter(course_id=course_id)
        return CourseMaterial.objects.all()

    def perform_create(self, serializer):
        # Verify instructor
        course = serializer.validated_data.get('course')
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You are not the instructor of this course.")
        serializer.save()

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

class UserCourseProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserCourseProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserCourseProgress.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        material_id = request.data.get('material')
        material = get_object_or_404(CourseMaterial, id=material_id)
        progress, created = UserCourseProgress.objects.get_or_create(
            user=request.user,
            course=material.course,
            material=material,
            defaults={'is_completed': True}
        )
        if not created:
            progress.is_completed = True
            progress.save()
        return Response(UserCourseProgressSerializer(progress).data, status=status.HTTP_201_CREATED)