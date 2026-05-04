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

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    position = serializers.CharField(source='user.position', read_only=True)
    is_verified_member = serializers.BooleanField(source='user.is_verified_member', read_only=True)
    labels = serializers.SerializerMethodField(read_only=True)
    accessible_menus = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ('user',)

    def get_accessible_menus(self, obj):
        return obj.user.get_all_accessible_menus()

    def get_labels(self, obj):
        return [label.name for label in obj.user.labels.all()]

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