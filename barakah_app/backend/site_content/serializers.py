from rest_framework import serializers
from .models import Partner, Testimonial, Activity, AboutUs, AboutUsLegalDocument, Announcement, HeroBanner, CalendarNote

class AnnouncementSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    class Meta:
        model = Announcement
        fields = '__all__'

class AboutUsLegalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutUsLegalDocument
        fields = '__all__'


class AboutUsSerializer(serializers.ModelSerializer):
    legal_documents = AboutUsLegalDocumentSerializer(many=True, read_only=True)
    class Meta:
        model = AboutUs
        fields = '__all__'

class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = '__all__'

class TestimonialSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = ['id', 'user', 'username', 'user_full_name', 'name', 'content', 'rating', 'is_approved', 'created_at']

    def get_user_full_name(self, obj):
        if obj.user:
            try:
                profile = obj.user.profile
                name = profile.name_full or obj.user.username
                rank = profile.get_job_display() or profile.get_segment_display()
                if rank:
                    return f"{name} ({rank})"
                return name
            except Exception:
                return obj.user.username
        return obj.name or 'Anonim'

class ActivitySerializer(serializers.ModelSerializer):
    likes_count = serializers.IntegerField(source='likes.count', read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = '__all__'

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if not representation.get('header_image'):
            image_url = instance.get_image_url
            if image_url:
                request = self.context.get('request')
                if request:
                    representation['header_image'] = request.build_absolute_uri(image_url)
                else:
                    representation['header_image'] = image_url
        return representation

class HeroBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroBanner
        fields = '__all__'

class CalendarNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CalendarNote
        fields = ['id', 'date', 'content', 'created_by', 'created_by_name',
                  'updated_by', 'updated_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'updated_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            try:
                return obj.created_by.profile.name_full or obj.created_by.username
            except Exception:
                return obj.created_by.username
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            try:
                return obj.updated_by.profile.name_full or obj.updated_by.username
            except Exception:
                return obj.updated_by.username
        return None
