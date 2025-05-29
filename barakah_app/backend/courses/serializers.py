# campaigns/serializers.py
from rest_framework import serializers
from .models import Course, Enrollment, CourseMaterial

class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseMaterial
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)
    class Meta:
        model = Course
        fields = '__all__'

class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = '__all__'

