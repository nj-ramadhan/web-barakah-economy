from rest_framework import serializers
from .models import Course, CourseEnrollment, CourseMaterial, UserCourseProgress, Certificate
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

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.ReadOnlyField(source='course.title')
    course_slug = serializers.ReadOnlyField(source='course.slug')
    
    class Meta:
        model = CourseEnrollment
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    materials = CourseMaterialSerializer(many=True, read_only=True)
    students = serializers.SerializerMethodField()
    instructor_name = serializers.ReadOnlyField(source='instructor.username')

    class Meta:
        model = Course
        fields = '__all__'

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


