from rest_framework import serializers
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress, Certificate, CertificateRequest
from django.contrib.auth import get_user_model

class CourseMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = '__all__'

class UserCourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCourseProgress
        fields = '__all__'

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = '__all__'

class CertificateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateRequest
        fields = '__all__'
        read_only_fields = ['user', 'status']

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')
    course_slug = serializers.ReadOnlyField(source='course.slug')
    
    class Meta:
        model = CourseEnrollment
        fields = ['id', 'user', 'course', 'course_title', 'course_slug', 'proof_file', 'enrolled_at', 'payment_status']

class CourseSerializer(serializers.ModelSerializer):
    materials = CourseMaterialSerializer(many=True, read_only=True)
    students = serializers.SerializerMethodField()
    instructor_name = serializers.ReadOnlyField(source='instructor.username')

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ['instructor']

    def get_students(self, obj):
        return [
            {
                "id": e.user.id,
                "username": getattr(e.user, "username", ""),
                "email": getattr(e.user, "email", ""),
                "full_name": getattr(getattr(e.user, "profile", None), "name_full", ""),
            }
            for e in obj.enrollments.filter(payment_status="verified").select_related("user")
            if e.user
        ]


