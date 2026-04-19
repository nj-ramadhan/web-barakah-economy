from rest_framework import viewsets, permissions, status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress, CertificateRequest
from .serializers import CourseSerializer, CourseEnrollmentSerializer, CourseMaterialSerializer, UserCourseProgressSerializer, CertificateRequestSerializer
from django.conf import settings
from django.shortcuts import render

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    authentication_classes = [JWTAuthentication]
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        # For instructors managing their own courses
        if self.action == 'my_courses':
            return Course.objects.filter(instructor=user)
        
        # Default visibility logic
        if self.action == 'list':
            # Public listing only shows active courses
            queryset = Course.objects.filter(is_active=True)
        elif self.action == 'retrieve':
            # Retrieve allows admins or instructors to see inactive courses
            if user.is_authenticated:
                if user.is_staff:
                    queryset = Course.objects.all()
                else:
                    queryset = Course.objects.filter(Q(is_active=True) | Q(instructor=user))
            else:
                queryset = Course.objects.filter(is_active=True)
        else:
            # For update/partial_update/destroy/etc.
            if user.is_authenticated and user.is_staff:
                queryset = Course.objects.all()
            elif user.is_authenticated:
                queryset = Course.objects.filter(instructor=user)
            else:
                queryset = Course.objects.filter(is_active=True)
        
        # Filter by featured status
        is_featured = self.request.query_params.get('is_featured', None)
        if is_featured:
            # Convert string param to boolean
            is_featured = is_featured.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_featured=is_featured)

        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def perform_update(self, serializer):
        # If admin is editing, preserve the original instructor
        if self.request.user.is_staff:
            serializer.save()
        else:
            # Ensure instructor doesn't change during regular update
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
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CourseEnrollment.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course')
        course = get_object_or_404(Course, id=course_id)
        
        # Check if user is already enrolled with 'paid' or 'verified' status
        # If so, we might not need a new enrollment, but for the 'checkout' flow
        # we usually create a 'pending' one if they are paying again.
        # However, for free courses, just return the existing one or create paid.
        
        existing_paid = CourseEnrollment.objects.filter(
            user=request.user, 
            course=course, 
            payment_status__in=['paid', 'verified']
        ).first()
        
        if existing_paid:
            return Response(CourseEnrollmentSerializer(existing_paid).data, status=status.HTTP_200_OK)

        # Create new enrollment (order)
        enrollment = CourseEnrollment.objects.create(
            user=request.user,
            course=course,
            instructor=course.instructor,  # Save direct link to instructor
            buyer_name=request.data.get('buyer_name', request.user.username),
            buyer_email=request.data.get('buyer_email', request.user.email),
            buyer_phone=request.data.get('buyer_phone', getattr(request.user, 'phone', '')),
            amount=course.price,
            payment_status='paid' if course.price == 0 else 'pending'
        )
        
        return Response(CourseEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='upload-proof')
    def upload_proof(self, request):
        course_id = request.data.get('course_id')
        
        try:
            enrollment = CourseEnrollment.objects.get(
                user=request.user,
                course_id=course_id,
                payment_status='pending'
            )
        except CourseEnrollment.DoesNotExist:
            return Response({'detail': 'Pendaftaran tidak ditemukan atau sudah diverifikasi.'}, status=status.HTTP_404_NOT_FOUND)

        proof_file = request.FILES.get('proof_file')
        if not proof_file:
            return Response({'detail': 'Bukti transfer wajib diunggah.'}, status=status.HTTP_400_BAD_REQUEST)

        enrollment.proof_file = proof_file
        enrollment.payment_status = 'verified'
        enrollment.save()

        return Response({'message': 'Bukti pembayaran berhasil diunggah.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.payment_status = 'paid'
        enrollment.save()
        return Response({'detail': 'Payment confirmed.'})

class CourseMaterialViewSet(viewsets.ModelViewSet):
    queryset = CourseMaterial.objects.all()
    serializer_class = CourseMaterialSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        course_id = self.request.query_params.get('course_id')
        if not course_id:
            # If no course_id, instructors see their own materials, or return empty
            return CourseMaterial.objects.filter(course__instructor=self.request.user)
            
        course = get_object_or_404(Course, id=course_id)
        
        # Check if user is instructor or enrolled with paid/verified status
        is_instructor = course.instructor == self.request.user
        is_enrolled = CourseEnrollment.objects.filter(
            user=self.request.user, 
            course=course, 
            payment_status__in=['paid', 'verified']
        ).exists()
        
        if is_instructor or is_enrolled:
            return CourseMaterial.objects.filter(course=course)
            
        return CourseMaterial.objects.none()

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
            defaults={
                'payment_status': 'pending',
                'instructor': course.instructor  # Persist instructor link
            }
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
    authentication_classes = [JWTAuthentication]
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

class CertificateRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateRequestSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Students see their own requests
        # Instructors see requests for their courses
        user = self.request.user
        return CertificateRequest.objects.filter(
            Q(user=user) | Q(course__instructor=user)
        ).distinct()

    def perform_create(self, serializer):
        # Ensure only one request per user per course
        course = serializer.validated_data.get('course')
        # We could add more validation here (e.g., check if course is completed)
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='by-course/(?P<course_id>[^/.]+)')
    def by_course(self, request, course_id=None):
        request_obj = CertificateRequest.objects.filter(user=request.user, course_id=course_id).first()
        if request_obj:
            return Response(CertificateRequestSerializer(request_obj).data)
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

class AdminCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'])
    def all_courses(self, request):
        courses = self.get_queryset()
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)

class CourseShareView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        course = get_object_or_404(Course, slug=slug)
        instructor = course.instructor
        
        # Build course name/title
        course_title = course.title
        instructor_name = instructor.username
            
        # Determine frontend domain
        if settings.DEBUG:
            frontend_url = 'http://localhost:3000'
        else:
            frontend_url = 'https://barakah-economy.com'

        # Build absolute thumbnail URL
        thumbnail_url = None
        if course.thumbnail:
            img_url = course.thumbnail.url
            if img_url.startswith('http'):
                thumbnail_url = img_url
            else:
                import urllib.parse
                encoded_path = urllib.parse.quote(img_url, safe='/:')
                thumbnail_url = f"{frontend_url}{encoded_path}"
        else:
            # Fallback to instructor profile picture
            profile = getattr(instructor, 'profile', None)
            if profile and profile.picture:
                img_url = profile.picture.url
                if img_url.startswith('http'):
                    thumbnail_url = img_url
                else:
                    import urllib.parse
                    encoded_path = urllib.parse.quote(img_url, safe='/:')
                    thumbnail_url = f"{frontend_url}{encoded_path}"
            
        # Build target frontend URL (Course Detail Page)
        target_url = f"{frontend_url}/kelas/{slug}"
        
        # Build share URL (the URL of this view)
        share_url = request.build_absolute_uri()

        return render(request, 'digital_products/product_share.html', {
            'item': course,
            'title': course_title,
            'description': course.description,
            'frontend_url': frontend_url,
            'thumbnail_url': thumbnail_url,
            'target_url': target_url,
            'share_url': share_url,
            'redirect_message': 'Membuka kelas...'
        })