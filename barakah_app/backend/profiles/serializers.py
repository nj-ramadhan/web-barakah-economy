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
    info_source_display = serializers.CharField(source='get_info_source_display', read_only=True)

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

class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    has_digital_products = serializers.SerializerMethodField()
    has_courses = serializers.SerializerMethodField()
    has_physical_products = serializers.SerializerMethodField()
    province_name = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'user_id', 'username', 'nickname', 'name_full', 'picture', 
            'google_picture_url', 'address_province', 'province_name',
            'has_digital_products', 'has_courses', 'has_physical_products',
            'labels'
        ]

    def get_has_digital_products(self, obj):
        return obj.user.digital_products.filter(is_active=True).exists()

    def get_has_courses(self, obj):
        return obj.user.instructed_courses.filter(is_active=True).exists()

    def get_has_physical_products(self, obj):
        return obj.user.physical_products.filter(is_active=True).exists()

    def get_province_name(self, obj):
        if not obj.address_province:
            return ""
        return dict(Profile.PROVINCE_CHOICES).get(obj.address_province, obj.address_province)

    def get_labels(self, obj):
        return [l.name for l in obj.user.labels.all()]