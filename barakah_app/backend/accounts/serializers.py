from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from profiles.serializers import ProfileSerializer
from .models import Role, UserLabel, LingkupTugas, BidangTugas

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class UserLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLabel
        fields = '__all__'


class LingkupTugasSerializer(serializers.ModelSerializer):
    class Meta:
        model = LingkupTugas
        fields = '__all__'


class BidangTugasSerializer(serializers.ModelSerializer):
    class Meta:
        model = BidangTugas
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
    lingkup_tugas = LingkupTugasSerializer(many=True, read_only=True)
    lingkup_tugas_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=LingkupTugas.objects.all(), write_only=True, required=False, source='lingkup_tugas'
    )
    bidang_tugas = BidangTugasSerializer(many=True, read_only=True)
    bidang_tugas_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=BidangTugas.objects.all(), write_only=True, required=False, source='bidang_tugas'
    )
    accessible_menus = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()
    event_attendance_detail = serializers.SerializerMethodField()
    meeting_attendance_summary = serializers.SerializerMethodField()

    def get_meeting_attendance_summary(self, obj):
        return obj.get_meeting_attendance_summary()

    def get_accessible_menus(self, obj):
        if not obj:
            return []
        return obj.get_all_accessible_menus()

    def get_event_attendance_detail(self, obj):
        from events.models import EventRegistration, EventAttendance
        from django.utils import timezone
        import json
        
        now = timezone.now()
        registrations = EventRegistration.objects.filter(user=obj).select_related('event')
        
        details = []
        for reg in registrations:
            event = reg.event
            has_attended = EventAttendance.objects.filter(registration=reg).exists()
            
            status = "Hadir" if has_attended else "Tidak Hadir"
            
            # If event is in the future or ongoing and not yet attended
            if not has_attended and event.start_date and event.start_date > now:
                status = "Terdaftar (Mendatang)"
            elif not has_attended and event.end_date and event.end_date > now:
                status = "Terdaftar (Sedang Berlangsung)"
            elif not has_attended and not event.end_date and event.start_date and event.start_date > now:
                 status = "Terdaftar (Mendatang)"
            
            details.append({
                'id': event.id,
                'title': event.title,
                'status': status,
                'date': event.start_date.strftime('%d %b %Y') if event.start_date else '-'
            })
            
        # Update the JSON field in the model for persistence/export
        # if obj.event_attendance_json != details:
        #     obj.event_attendance_json = details
        #     obj.save(update_fields=['event_attendance_json'])
            
        return details

    def get_activities(self, obj):
        from donations.models import Donation
        from events.models import EventRegistration
        from orders.models import OrderItem
        from courses.models import CourseEnrollment
        from digital_products.models import DigitalOrder
        
        # Charity - Show verified and pending
        donations = Donation.objects.filter(donor=obj).exclude(payment_status='rejected').values('campaign__title', 'amount', 'payment_status')
        status_map = {'pending': 'MENUNGGU', 'verified': 'TERVERIFIKASI', 'approved': 'DISETUJUI'}
        charity_list = [f"{d.get('campaign__title') or 'Tanpa Judul'} (Rp {int(d.get('amount') or 0):,}) - {status_map.get(d.get('payment_status'), 'MENUNGGU')}" for d in donations]
        
        # Events - Show both approved and pending
        events = EventRegistration.objects.filter(user=obj).exclude(status='rejected').values('event__title', 'payment_amount', 'status')
        reg_status_map = {'pending': 'MENUNGGU', 'approved': 'DISETUJUI', 'rejected': 'DITOLAK'}
        event_list = [f"{e.get('event__title')} ({reg_status_map.get(e.get('status'), 'MENUNGGU')})" for e in events]
        
        # Sinergy
        # Exclude Pending and Batal statuses to show only active/completed activities
        sinergy_items = OrderItem.objects.filter(
            order__user=obj
        ).exclude(
            order__status__in=['Batal', 'batal', 'Rejected', 'rejected']
        ).select_related('product', 'variation')
        sinergy_list = []
        for item in sinergy_items:
            var_str = f" ({item.variation.name})" if item.variation else ""
            sinergy_list.append(f"{item.product.title}{var_str} x{item.quantity}")
            
        # E-Course
        courses = CourseEnrollment.objects.filter(user=obj, payment_status__in=['verified', 'paid']).values_list('course__title', flat=True)
        course_list = list(courses)
        
        # Digital Products
        digital = DigitalOrder.objects.filter(buyer=obj, payment_status='verified').values_list('digital_product__title', flat=True)
        digital_list = list(digital)
        
        return {
            'charity': charity_list,
            'events': event_list,
            'sinergy': sinergy_list,
            'courses': course_list,
            'digital_products': digital_list
        }

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'phone', 'role', 'is_verified_member',
            'position',
            'profile', 'date_joined',
            'custom_roles', 'custom_role_ids',
            'labels', 'label_ids',
            'lingkup_tugas', 'lingkup_tugas_ids',
            'bidang_tugas', 'bidang_tugas_ids',
            'accessible_menus',
            'activities',
            'event_attendance_detail',
            'event_attendance_json',
            'meeting_attendance_summary',
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        # PrimaryKeyRelatedField(source='custom_roles') resolves to validated_data['custom_roles']
        custom_roles = validated_data.pop('custom_roles', None)
        labels = validated_data.pop('labels', None)
        lingkup_tugas = validated_data.pop('lingkup_tugas', None)
        bidang_tugas = validated_data.pop('bidang_tugas', None)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Profile fields
        if profile_data:
            from profiles.models import Profile
            profile, created = Profile.objects.get_or_create(user=instance)
            
            # Remove 'user' from profile_data if it exists (comes from source='user.phone')
            # The phone itself might be in user_data or directly in profile_data depending on DRF parsing
            user_nested_data = profile_data.pop('user', {})
            phone = user_nested_data.get('phone')
            if phone:
                instance.phone = phone
                instance.save()

            for attr, value in profile_data.items():
                if hasattr(profile, attr):
                    setattr(profile, attr, value)
            profile.save()

        # Update M2M relationships explicitly
        if custom_roles is not None:
            instance.custom_roles.set(custom_roles)
        if labels is not None:
            instance.labels.set(labels)
        if lingkup_tugas is not None:
            instance.lingkup_tugas.set(lingkup_tugas)
        if bidang_tugas is not None:
            instance.bidang_tugas.set(bidang_tugas)
            
        instance.save() 
        instance.refresh_from_db() # Ensure M2M and other changes are fully loaded for response
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    name_full = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_verified_member = serializers.BooleanField(default=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone', 'name_full', 'role', 'is_verified_member')

    def create(self, validated_data):
        name_full = validated_data.pop('name_full', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
        )
        # Auto-buat profil dengan nama lengkap
        if name_full:
            from profiles.models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.name_full = name_full
            profile.save()
            
        # Beri label Simpatisan otomatis
        from .models import UserLabel
        label_simpatisan, _ = UserLabel.objects.get_or_create(name='Simpatisan')
        user.labels.add(label_simpatisan)
            
        return user

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

class UserSimpleSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    def get_full_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.name_full if profile else obj.username

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'full_name')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_id = attrs.get('username')
        if login_id:
            user_obj = User.objects.filter(email=login_id).first() or \
                       User.objects.filter(username=login_id).first()
            if user_obj:
                attrs['username'] = user_obj.username
        
        data = super().validate(attrs)
        data['id'] = self.user.id
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['role'] = self.user.role
        data['is_profile_complete'] = self.user.is_profile_complete
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token