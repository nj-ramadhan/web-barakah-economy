from rest_framework import serializers
from .models import ZISConfig, ZISSubmission

class ZISConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZISConfig
        fields = '__all__'

class ZISSubmissionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ZISSubmission
        fields = '__all__'
        read_only_fields = ['user', 'status', 'rejection_reason']
