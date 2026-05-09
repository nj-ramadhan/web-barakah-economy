from rest_framework import serializers
from .models import Meeting, MeetingSession, MeetingParticipant, SessionAttendance
from accounts.serializers import UserSimpleSerializer

class MeetingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingSession
        fields = ['id', 'title', 'start_time', 'end_time', 'order', 'is_finished']

class SessionAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAttendance
        fields = ['id', 'session', 'status', 'remarks', 'marked_at', 'marked_by']

class MeetingSerializer(serializers.ModelSerializer):
    sessions = MeetingSessionSerializer(many=True, required=False)
    created_by_details = UserSimpleSerializer(source='created_by', read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'subtitle', 'description', 'slug', 
            'start_date', 'end_date', 'location', 'location_url', 
            'thumbnail', 'created_by', 'created_by_details', 
            'created_at', 'updated_at', 'sessions', 'participant_count'
        ]
        read_only_fields = ['slug', 'created_by', 'created_at', 'updated_at']

    def get_participant_count(self, obj):
        return obj.participants.count()

    def create(self, validated_data):
        sessions_data = validated_data.pop('sessions', [])
        meeting = Meeting.objects.create(**validated_data)
        for session_data in sessions_data:
            MeetingSession.objects.create(meeting=meeting, **session_data)
        return meeting

    def update(self, instance, validated_data):
        sessions_data = validated_data.pop('sessions', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if sessions_data is not None:
            # Simple sync: delete and recreate
            instance.sessions.all().delete()
            for session_data in sessions_data:
                MeetingSession.objects.create(meeting=instance, **session_data)
        
        return instance

class MeetingParticipantSerializer(serializers.ModelSerializer):
    user_details = UserSimpleSerializer(source='user', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    session_attendances = SessionAttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = [
            'id', 'meeting', 'user', 'user_details', 
            'status', 'remarks', 'joined_at', 
            'marked_at', 'marked_by', 'marked_by_name',
            'session_attendances'
        ]
        read_only_fields = ['joined_at', 'marked_at', 'marked_by']

    def get_marked_by_name(self, obj):
        return obj.marked_by.username if obj.marked_by else None
