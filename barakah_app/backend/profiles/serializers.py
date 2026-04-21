# profiles/serializers.py
from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    accessible_menus = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ('user',)

    def get_accessible_menus(self, obj):
        return obj.user.get_all_accessible_menus()

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