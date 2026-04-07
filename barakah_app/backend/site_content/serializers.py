from rest_framework import serializers
from .models import Partner, Testimonial, Activity, AboutUs

class AboutUsSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = Activity
        fields = '__all__'
