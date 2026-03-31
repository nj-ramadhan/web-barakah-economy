from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from profiles.serializers import ProfileSerializer
from .models import Role, UserLabel

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class UserLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLabel
        fields = '__all__'


class UserAdminSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)
    custom_roles = RoleSerializer(many=True, read_only=True)
    custom_role_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Role.objects.all(), write_only=True, required=False, source='custom_roles'
    )
    labels = UserLabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=UserLabel.objects.all(), write_only=True, required=False, source='labels'
    )

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'phone', 'role', 'is_verified_member',
            'profile', 'date_joined',
            'custom_roles', 'custom_role_ids',
            'labels', 'label_ids',
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        custom_roles = validated_data.pop('custom_roles', None)
        labels = validated_data.pop('labels', None)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Profile fields
        if profile_data:
            from profiles.models import Profile
            profile, created = Profile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        # Update M2M relationships
        if custom_roles is not None:
            instance.custom_roles.set(custom_roles)
        if labels is not None:
            instance.labels.set(labels)
            
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    is_verified_member = serializers.BooleanField(default=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone', 'role', 'is_verified_member')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
        )
        return user

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token