from rest_framework import serializers
from .models import Partner, Testimonial, Activity, AboutUs, AboutUsLegalDocument, Announcement, HeroBanner

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

class HeroBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroBanner
        fields = '__all__'
