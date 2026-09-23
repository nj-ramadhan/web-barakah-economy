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
    username = serializers.CharField(source='user.username', required=False)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    position = serializers.CharField(source='user.position', read_only=True)
    is_verified_member = serializers.BooleanField(source='user.is_verified_member', read_only=True)
    labels = serializers.SerializerMethodField(read_only=True)
    accessible_menus = serializers.SerializerMethodField(read_only=True)
    is_profile_complete = serializers.SerializerMethodField(read_only=True)
    info_source_display = serializers.CharField(source='get_info_source_display', read_only=True)
    has_usable_password = serializers.SerializerMethodField(read_only=True)

    followers_count = serializers.SerializerMethodField(read_only=True)
    following_count = serializers.SerializerMethodField(read_only=True)
    shop_likes_count = serializers.SerializerMethodField(read_only=True)
    is_following = serializers.SerializerMethodField(read_only=True)
    is_shop_liked = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ('user',)

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        for bool_field in ['is_operational_hours_active', 'is_preorder', 'is_delivery_schedule_active', 'out_of_po_shipping_active', 'allow_delivery_timing_choice']:
            if bool_field in mutable_data:
                val = mutable_data[bool_field]
                if isinstance(val, str):
                    mutable_data[bool_field] = val.lower() in ('true', '1', 't')
        for null_field in ['delivery_date', 'preorder_days_min', 'preorder_days_max', 'delivery_range_min', 'delivery_range_max', 'out_of_po_shipping_cost']:
            if null_field in mutable_data and mutable_data[null_field] in ('', 'null', 'undefined', None):
                if null_field == 'out_of_po_shipping_cost':
                    mutable_data[null_field] = 0
                else:
                    mutable_data[null_field] = None
        return super().to_internal_value(mutable_data)

    def get_followers_count(self, obj):
        return obj.user.follower_relations.count()

    def get_following_count(self, obj):
        return obj.user.following_relations.count()

    def get_shop_likes_count(self, obj):
        return obj.user.shop_likes.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user.follower_relations.filter(follower=request.user).exists()
        return False

    def get_is_shop_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user.shop_likes.filter(user=request.user).exists()
        return False

    def get_accessible_menus(self, obj):
        return obj.user.get_all_accessible_menus()

    def get_labels(self, obj):
        return [label.name for label in obj.user.labels.all()]

    def get_is_profile_complete(self, obj):
        # Avoid Django relationship caching issues by checking fields directly on `obj` (Profile)
        # and `obj.user` (User) which are fresh in this serialization cycle.
        is_referred_by_complete = True
        if obj.info_source == 'teman':
            is_referred_by_complete = bool(obj.referred_by)
            
        return bool(
            obj.user.phone and 
            obj.name_full and 
            obj.info_source and 
            is_referred_by_complete and 
            obj.agama and
            obj.marital_status and
            obj.segment
        )

    def get_has_usable_password(self, obj):
        return obj.user.has_usable_password()

    def update(self, instance, validated_data):
        # Extract phone & username from user source if present in validated_data
        user_data = validated_data.pop('user', {})
        phone = user_data.get('phone')
        username = user_data.get('username')
        
        # Also check direct fields (depending on how DRF parses 'source')
        if not phone and 'phone' in validated_data:
            phone = validated_data.pop('phone')
        if not username and 'username' in validated_data:
            username = validated_data.pop('username')

        if phone is not None:
            instance.user.phone = phone
            instance.user.save(update_fields=['phone'])

        if username is not None and username != instance.user.username:
            if instance.username_change_count >= 1:
                raise serializers.ValidationError({'username': 'Anda hanya dapat mengubah username sebanyak 1 kali.'})
            
            # Check unique username
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if User.objects.filter(username=username).exclude(id=instance.user.id).exists():
                raise serializers.ValidationError({'username': 'Username ini sudah digunakan oleh pengguna lain.'})

            instance.user.username = username
            instance.user.save(update_fields=['username'])
            instance.username_change_count += 1
            # We will manually save this field below, or let super().update save it as part of model fields.
            # But let's save it here just in case, since we popped it out or to keep count accurate.
            instance.save(update_fields=['username_change_count'])
            
        return super().update(instance, validated_data)

class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    has_digital_products = serializers.SerializerMethodField()
    has_courses = serializers.SerializerMethodField()
    has_physical_products = serializers.SerializerMethodField()
    province_name = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    labels = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    shop_likes_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_shop_liked = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'user_id', 'username', 'nickname', 'name_full', 'picture', 
            'google_picture_url', 'address_province', 'province_name',
            'address_city_name', 'city_name',
            'has_digital_products', 'has_courses', 'has_physical_products',
            'labels', 'shop_name', 'shop_thumbnail', 'shop_description',
            'followers_count', 'following_count', 'shop_likes_count',
            'is_following', 'is_shop_liked',
            'shop_header_style', 'shop_text_color', 'shop_supported_couriers',
            'is_operational_hours_active', 'operational_hours',
            'is_preorder', 'preorder_type', 'preorder_days', 'preorder_days_min', 'preorder_days_max', 'preorder_duration',
            'is_delivery_schedule_active', 'delivery_schedule_type', 'delivery_range_min', 'delivery_range_max', 'delivery_days', 'delivery_date', 'delivery_note',
            'out_of_po_shipping_active', 'out_of_po_shipping_type', 'out_of_po_shipping_cost', 'allow_delivery_timing_choice'
        ]

    def get_followers_count(self, obj):
        return obj.user.follower_relations.count()

    def get_following_count(self, obj):
        return obj.user.following_relations.count()

    def get_shop_likes_count(self, obj):
        return obj.user.shop_likes.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user.follower_relations.filter(follower=request.user).exists()
        return False

    def get_is_shop_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user.shop_likes.filter(user=request.user).exists()
        return False

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

    def get_city_name(self, obj):
        if obj.address_city_name:
            return obj.address_city_name
        if obj.address_subdistrict_name:
            return f"Kec. {obj.address_subdistrict_name}"
        return ""

    def get_labels(self, obj):
        return [l.name for l in obj.user.labels.all()]