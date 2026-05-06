from rest_framework import viewsets, permissions, status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress, CertificateRequest, CourseCertificate
from .serializers import CourseSerializer, CourseEnrollmentSerializer, CourseMaterialSerializer, UserCourseProgressSerializer, CertificateRequestSerializer, CourseCertificateSerializer
from django.conf import settings
from django.shortcuts import render

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    authentication_classes = [JWTAuthentication]
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = 'slug'

    def get_object(self):
        """
        Override get_object to support lookups by both ID and slug.
        This is useful for backward compatibility with old links.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get the value from the URL, checking both 'slug' (lookup_field) and 'pk'
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field) or self.kwargs.get('pk')
        
        if not lookup_value:
            from django.http import Http404
            raise Http404

        # Try to find by slug first
        obj = queryset.filter(slug=lookup_value).first()
        
        if obj is None:
            # If not found by slug, try by ID if it's numeric
            if str(lookup_value).isdigit():
                obj = queryset.filter(pk=lookup_value).first()
        
        if obj is None:
            from django.http import Http404
            raise Http404

        self.check_object_permissions(self.request, obj)
        return obj

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
        return queryset.order_by('-is_featured', '-created_at')

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def perform_update(self, serializer):
        # If admin is editing, preserve the original instructor
        if self.request.user.is_staff:
            serializer.save()
        else:
            # Ensure instructor doesn't change during regular update
            serializer.save(instructor=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        from django.db.models import F
        instance.view_count = F('view_count') + 1
        instance.save(update_fields=['view_count'])
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        courses = self.get_queryset()
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='buyers')
    def buyers(self, request, pk=None):
        try:
            course = self.get_object()
            if course.instructor != request.user and not request.user.is_staff:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            enrollments = CourseEnrollment.objects.filter(course=course, payment_status__in=['paid', 'verified'])
            serializer = CourseEnrollmentSerializer(enrollments, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get', 'post'], url_path='certificate_settings')
    def certificate_settings(self, request, pk=None):
        course = self.get_object()
        
        # Check if user is instructor or admin
        if not (request.user == course.instructor or request.user.is_staff):
            return Response({'detail': 'Hanya instruktur yang bisa mengubah pengaturan sertifikat.'}, status=403)
            
        cert, created = CourseCertificate.objects.get_or_create(course=course)
        
        if request.method == 'POST':
            # Handle template image upload separately
            template_image = request.FILES.get('template_image')
            if template_image:
                cert.template_image = template_image
            
            # Use serializer for other fields
            serializer = CourseCertificateSerializer(cert, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
        serializer = CourseCertificateSerializer(cert)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='download_certificate')
    def download_certificate(self, request, pk=None):
        course = self.get_object()
        user = request.user
        
        # Check if user is enrolled
        is_enrolled = CourseEnrollment.objects.filter(
            user=user, 
            course=course, 
            payment_status__in=['paid', 'verified']
        ).exists()
        
        if not is_enrolled and not user.is_staff and user != course.instructor:
            return Response({'error': 'Anda belum terdaftar di kelas ini.'}, status=403)
            
        # Check if course is completed
        total_materials = course.materials.count()
        completed_materials = UserCourseProgress.objects.filter(user=user, course=course, is_completed=True).count()
        
        if total_materials > 0 and completed_materials < total_materials and not user.is_staff:
             return Response({'error': 'Silakan selesaikan semua materi kelas terlebih dahulu.'}, status=400)

        try:
            cert = course.certificate_design
        except:
            return Response({'error': 'Sertifikat belum dikonfigurasi untuk kelas ini.'}, status=404)
            
        if not cert.template_image:
            return Response({'error': 'Template sertifikat belum diunggah.'}, status=404)

        # Get participant name from profile
        profile = getattr(user, 'profile', None)
        participant_name = (profile.name_full if profile else user.username) or user.username
        
        if not participant_name:
            return Response({'error': 'Nama lengkap belum diisi di profil Anda.'}, status=400)

        # Generate image using Pillow
        from PIL import Image, ImageDraw, ImageFont
        import os
        from django.http import HttpResponse
        from io import BytesIO
        
        try:
            # Open template
            img = Image.open(cert.template_image.path).convert("RGB")
            draw = ImageDraw.Draw(img)
            width, height = img.size
            
            # Position calculations (percentages to pixels)
            name_x_px = int(width * cert.name_x / 100)
            name_y_px = int(height * cert.name_y / 100)
            name_width_px = int(width * cert.name_width / 100)
            name_height_px = int(height * cert.name_height / 100)
            
            # Scale font size relative to image height (reference: 1000px height)
            scaled_font_size = int((cert.font_size / 1000.0) * height)
            
            # Load font
            font_filename = cert.font_family
            fonts_dir = os.path.join(os.path.dirname(__file__), 'fonts')
            os.makedirs(fonts_dir, exist_ok=True)
            font_path = os.path.join(fonts_dir, font_filename)
            
            # Auto-download if missing
            if not os.path.exists(font_path):
                import requests
                font_urls = {
                    'DancingScript-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf',
                    'GreatVibes-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf',
                    'Roboto-Bold.ttf': 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
                    'PlayfairDisplay-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
                    'Montserrat-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-SemiBold.ttf'
                }
                if font_filename in font_urls:
                    try:
                        r = requests.get(font_urls[font_filename], timeout=10)
                        if r.status_code == 200:
                            with open(font_path, 'wb') as f:
                                f.write(r.content)
                    except:
                        pass

            font = None
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, scaled_font_size)
                except:
                    pass
            
            if not font:
                # Attempt to find any font in a common system location
                fallbacks = ["arial.ttf", "DejaVuSans.ttf", "Roboto-Regular.ttf"]
                if cert.font_bold:
                    fallbacks = ["arialbd.ttf", "DejaVuSans-Bold.ttf"] + fallbacks
                
                for f_name in fallbacks:
                    try:
                        font = ImageFont.truetype(f_name, scaled_font_size)
                        break
                    except:
                        continue
            
            if not font:
                font = ImageFont.load_default()

            # Prepare text drawing
            color = cert.font_color if cert.font_color.startswith('#') else '#000000'
            
            # Word Wrap Logic
            def wrap_text(text, font, max_width):
                lines = []
                words = text.split()
                if not words: return []
                
                current_line = words[0]
                for word in words[1:]:
                    test_line = current_line + " " + word
                    try:
                        left, top, right, bottom = draw.textbbox((0, 0), test_line, font=font)
                        w = right - left
                    except:
                        w, _ = draw.textsize(test_line, font=font)
                    
                    if w <= max_width:
                        current_line = test_line
                    else:
                        lines.append(current_line)
                        current_line = word
                lines.append(current_line)
                return lines

            lines = wrap_text(participant_name, font, name_width_px)

            # Calculate total height of all lines to handle vertical alignment
            total_text_height = 0
            line_details = []
            for line in lines:
                try:
                    left, top, right, bottom = draw.textbbox((0, 0), line, font=font)
                    w, h = right - left, bottom - top
                except:
                    w, h = draw.textsize(line, font=font)
                
                line_spacing = int(h * 0.2)
                line_details.append({'text': line, 'w': w, 'h': h, 'spacing': line_spacing})
                total_text_height += h + line_spacing
            
            if line_details:
                total_text_height -= line_details[-1]['spacing'] # Remove last spacing

            # Calculate starting Y based on vertical alignment
            v_align = getattr(cert, 'vertical_align', 'middle')
            if v_align == 'top':
                start_y = name_y_px
            elif v_align == 'bottom':
                start_y = name_y_px + name_height_px - total_text_height
            else: # middle
                start_y = name_y_px + (name_height_px - total_text_height) // 2

            # Draw lines
            current_y = start_y
            for detail in line_details:
                # Horizontal Align
                if cert.text_align == 'left':
                    line_x = name_x_px
                elif cert.text_align == 'right':
                    line_x = name_x_px + name_width_px - detail['w']
                else: # center
                    line_x = name_x_px + (name_width_px - detail['w']) // 2
                
                draw.text((line_x, current_y), detail['text'], font=font, fill=color)
                current_y += detail['h'] + detail['spacing']

            # Draw Unique Code if active
            if cert.show_unique_code:
                code_x_px = int(width * cert.code_x / 100)
                code_y_px = int(height * cert.code_y / 100)
                code_font_size = int((cert.code_font_size / 1000.0) * height)
                code_font_family = getattr(cert, 'code_font_family', 'Roboto-Bold.ttf')
                code_font_color = getattr(cert, 'code_font_color', color)
                
                code_font_path = os.path.join(fonts_dir, code_font_family)
                
                # Auto-download code font if missing
                if not os.path.exists(code_font_path):
                    try:
                        font_urls = {
                            'DancingScript-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf',
                            'GreatVibes-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf',
                            'Roboto-Bold.ttf': 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf',
                            'PlayfairDisplay-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf',
                            'Montserrat-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-SemiBold.ttf'
                        }
                        if code_font_family in font_urls:
                            import requests
                            r = requests.get(font_urls[code_font_family], timeout=10)
                            if r.status_code == 200:
                                with open(code_font_path, 'wb') as f:
                                    f.write(r.content)
                    except:
                        pass

                code_font = None
                if os.path.exists(code_font_path):
                    try:
                        code_font = ImageFont.truetype(code_font_path, code_font_size)
                    except:
                        pass
                
                if not code_font:
                    code_font = font # Fallback

                # Generate unique code (e.g. EC-COURSEID-USERID)
                unique_code = f"BAE-EC-{course.id}-{user.id}"
                draw.text((code_x_px, code_y_px), unique_code, font=code_font, fill=code_font_color)

            # Draw Completion Date if active
            if getattr(cert, 'show_date', False):
                # Get the latest completion date
                latest_progress = UserCourseProgress.objects.filter(
                    user=user, 
                    course=course, 
                    is_completed=True
                ).order_by('-completed_at').first()
                
                if latest_progress and latest_progress.completed_at:
                    from django.utils import timezone
                    # Format: Jakarta, 25 April 2026
                    # (Assuming Jakarta as default or we can just use the date)
                    months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                              "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                    dt = latest_progress.completed_at
                    date_str = f"{dt.day} {months[dt.month-1]} {dt.year}"
                    
                    date_x_px = int(width * cert.date_x / 100)
                    date_y_px = int(height * cert.date_y / 100)
                    date_font_size = int((cert.date_font_size / 1000.0) * height)
                    date_font_family = getattr(cert, 'date_font_family', 'Roboto-Bold.ttf')
                    date_font_color = getattr(cert, 'date_font_color', color)
                    
                    date_font_path = os.path.join(fonts_dir, date_font_family)
                    
                    # Ensure font is available (reusing fonts_dir logic)
                    if not os.path.exists(date_font_path):
                        try:
                            # (Font download logic omitted here as it should be handled above or in a helper)
                            pass
                        except: pass
                    
                    try:
                        date_font = ImageFont.truetype(date_font_path, date_font_size) if os.path.exists(date_font_path) else font
                    except:
                        date_font = font
                        
                    draw.text((date_x_px, date_y_px), date_str, font=date_font, fill=date_font_color)

            # Save to response
            response = HttpResponse(content_type="image/jpeg")
            img.save(response, "JPEG", quality=95)
            response['Content-Disposition'] = f'attachment; filename="Certificate_{course.slug}.jpg"'
            return response

        except Exception as e:
            return Response({'error': f'Gagal membuat sertifikat: {str(e)}'}, status=500)

class CourseDetailViewSet(APIView):
    def get(self, request, slug):
        course = get_object_or_404(Course, slug=slug)
        from django.db.models import F
        course.view_count = F('view_count') + 1
        course.save(update_fields=['view_count'])
        course.refresh_from_db()
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
            # frontend_url = 'https://barakah-economy.com'    
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