from rest_framework import serializers
from .models import Activity

class ActivitySerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Activity
        fields = [
            'id', 'user', 'username', 'activity_type', 
            'start_time', 'end_time', 
            'distance', 'duration', 'pace', 'calories', 
            'route_data', 'is_completed', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']
