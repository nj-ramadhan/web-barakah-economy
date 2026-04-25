from rest_framework import serializers
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress, Certificate, CertificateRequest, CourseCertificate
from django.contrib.auth import get_user_model

class CourseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = ['id', 'course', 'title', 'description', 'youtube_link', 'pdf_file', 'order', 'created_at']

class UserCourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCourseProgress
        fields = ['id', 'user', 'course', 'material', 'is_completed', 'completed_at']

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = '__all__'

class CertificateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateRequest
        fields = ['id', 'user', 'course', 'full_name', 'email', 'whatsapp', 'notes', 'status', 'created_at']
        read_only_fields = ['user', 'status']

class CourseCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCertificate
        fields = '__all__'

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')
    course_slug = serializers.ReadOnlyField(source='course.slug')
    course_thumbnail = serializers.ImageField(source='course.thumbnail', read_only=True)
    student_count = serializers.SerializerMethodField()
    material_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'user', 'course', 'course_title', 'course_slug', 'course_thumbnail',
            'buyer_name', 'buyer_email', 'buyer_phone',
            'proof_file', 'enrolled_at', 'payment_status', 
            'student_count', 'material_count'
        ]
        # Temporarily excluded potentially missing fields: 'instructor', 'order_number'

    def get_student_count(self, obj):
        if not obj.course:
            return 0
        return obj.course.enrollments.filter(payment_status__in=['paid', 'verified']).count()

    def get_material_count(self, obj):
        if not obj.course:
            return 0
        return obj.course.materials.count()

class CourseSerializer(serializers.ModelSerializer):
    materials = CourseMaterialSerializer(many=True, read_only=True)
    students = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    material_count = serializers.SerializerMethodField()
    instructor_name = serializers.ReadOnlyField(source='instructor.username')
    certificate_design = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'instructor', 'instructor_name',
            'thumbnail', 'price', 'discount', 'is_active', 'is_featured', 'category',
            'duration', 'has_certificate', 'certificate_info', 'view_count', 'created_at', 
            'materials', 'student_count', 'material_count', 'students', 'certificate_design'
        ]
        read_only_fields = ['instructor']

    def get_student_count(self, obj):
        return obj.enrollments.filter(payment_status__in=['paid', 'verified']).count()

    def get_material_count(self, obj):
        return obj.materials.count()

    def get_students(self, obj):
        students_list = []
        enrollments = obj.enrollments.filter(payment_status__in=['paid', 'verified']).select_related("user")
        
        for e in enrollments:
            if not e.user:
                continue
                
            student_data = {
                "id": e.user.id,
                "username": e.user.username,
                "email": e.user.email,
                "full_name": ""
            }
            
            # Safe profile access
            try:
                profile = getattr(e.user, 'profile', None)
                if profile:
                    student_data["full_name"] = profile.name_full or e.user.username
            except Exception:
                pass
                
            students_list.append(student_data)
            
        return students_list

    def get_certificate_design(self, obj):
        try:
            design = getattr(obj, 'certificate_design', None)
            if design:
                return CourseCertificateSerializer(design).data
            return None
        except Exception:
            return None


