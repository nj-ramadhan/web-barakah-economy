from rest_framework import serializers
from .models import Event
from accounts.serializers import UserSimpleSerializer

class EventSimpleSerializer(serializers.ModelSerializer):
    created_by_details = UserSimpleSerializer(source='created_by', read_only=True)
    registration_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'description', 'short_description', 
            'start_date', 'end_date', 'location', 'organizer_name', 
            'status', 'visibility', 'thumbnail', 'registration_count',
            'attachment_file', 'attachment_link', 'rejection_reason',
            'created_by_details', 'created_at', 'has_special_qr', 'has_bib'
        ]

    def get_registration_count(self, obj):
        try:
            return obj.registrations.count()
        except:
            return 0
