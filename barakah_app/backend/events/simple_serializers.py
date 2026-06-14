from rest_framework import serializers
from .models import Event
from accounts.serializers import UserSimpleSerializer

class EventSimpleSerializer(serializers.ModelSerializer):
    created_by_details = UserSimpleSerializer(source='created_by', read_only=True)
    registration_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    testimonies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'description', 'short_description', 
            'start_date', 'end_date', 'location', 'organizer_name', 
            'status', 'visibility', 'thumbnail', 'registration_count',
            'attachment_file', 'attachment_link', 'rejection_reason',
            'created_by_details', 'created_at', 'has_special_qr', 'has_bib',
            'average_rating', 'testimonies_count'
        ]

    def get_registration_count(self, obj):
        try:
            return obj.registrations.count()
        except:
            return 0

    def get_average_rating(self, obj):
        try:
            testimonies = obj.testimonies.all()
            if not testimonies.exists():
                return 5.0
            total = sum(t.rating for t in testimonies)
            return round(total / testimonies.count(), 1)
        except Exception:
            return 5.0

    def get_testimonies_count(self, obj):
        try:
            return obj.testimonies.count()
        except Exception:
            return 0
