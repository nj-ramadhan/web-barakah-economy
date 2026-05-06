from rest_framework import serializers
from .models import Profile, BusinessProfile

class BusinessProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    business_field_display = serializers.CharField(source='get_business_field_display', read_only=True)
    business_scale_display = serializers.CharField(source='get_business_scale_display', read_only=True)
    business_status_display = serializers.CharField(source='get_business_status_display', read_only=True)
    sales_area_display = serializers.CharField(source='get_sales_area_display', read_only=True)
    readiness_order_display = serializers.CharField(source='get_readiness_order_display', read_only=True)

    class Meta:
        model = BusinessProfile
        fields = '__all__'
        read_only_fields = ('user', 'is_curated')

    def to_internal_value(self, data):
        # Parse JSON fields if they are sent as strings via FormData
        import json
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        
        for field in ['business_needs']:
            if field in mutable_data:
                val = mutable_data[field]
                if isinstance(val, str):
                    try:
                        mutable_data[field] = json.loads(val)
                    except json.JSONDecodeError:
                        # Fallback if it's a simple string or single value
                        mutable_data[field] = [val] if val else []
        
        return super().to_internal_value(mutable_data)

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    position = serializers.CharField(source='user.position', read_only=True)
    is_verified_member = serializers.BooleanField(source='user.is_verified_member', read_only=True)
    labels = serializers.SerializerMethodField(read_only=True)
    accessible_menus = serializers.SerializerMethodField(read_only=True)
    is_profile_complete = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ('user',)

    def get_accessible_menus(self, obj):
        return obj.user.get_all_accessible_menus()

    def get_labels(self, obj):
        return [label.name for label in obj.user.labels.all()]

    def get_is_profile_complete(self, obj):
        return obj.user.is_profile_complete

    def update(self, instance, validated_data):
        # Extract phone from user source if present in validated_data
        user_data = validated_data.pop('user', {})
        phone = user_data.get('phone')
        
        # Also check if 'phone' was passed directly (depending on how DRF parses 'source')
        if not phone and 'phone' in validated_data:
            phone = validated_data.pop('phone')

        if phone is not None:
            instance.user.phone = phone
            instance.user.save()
            
        return super().update(instance, validated_data)