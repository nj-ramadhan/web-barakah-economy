from rest_framework import serializers
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile, EventDocumentationImage, EventCertificate
from accounts.serializers import UserAdminSerializer

class EventFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventFormField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'placeholder', 'order']

class EventDocumentationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDocumentationImage
        fields = ['id', 'image', 'created_at']

from .models import EventSpeaker, EventSession, EventAttendance

class EventSpeakerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSpeaker
        fields = ['id', 'name', 'role', 'photo', 'order']

class EventSessionSerializer(serializers.ModelSerializer):
    attendance_count = serializers.SerializerMethodField()
    class Meta:
        model = EventSession
        fields = ['id', 'title', 'start_time', 'end_time', 'order', 'attendance_count']

    def get_attendance_count(self, obj):
        return obj.attendances.count()

class EventAttendanceSerializer(serializers.ModelSerializer):
    session = serializers.PrimaryKeyRelatedField(read_only=True)
    session_title = serializers.SerializerMethodField()
    scanned_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EventAttendance
        fields = ['id', 'session', 'session_title', 'attended_at', 'scanned_by_name']

    def get_session_title(self, obj):
        return obj.session.title if obj.session else "Umum"

    def get_scanned_by_name(self, obj):
        if obj.scanned_by:
            profile = getattr(obj.scanned_by, 'profile', None)
            return profile.name_full if profile and profile.name_full else obj.scanned_by.username
        return ""


class EventCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCertificate
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    created_by_details = UserAdminSerializer(source='created_by', read_only=True)
    form_fields = EventFormFieldSerializer(many=True, required=False)
    documentation_images = EventDocumentationImageSerializer(many=True, read_only=True)
    speakers = EventSpeakerSerializer(many=True, required=False)
    sessions = EventSessionSerializer(many=True, required=False)
    registration_count = serializers.SerializerMethodField()
    attended_count = serializers.SerializerMethodField()
    user_registration = serializers.SerializerMethodField()
    certificate = EventCertificateSerializer(read_only=True)

    def get_registration_count(self, obj):
        # Count all registrations as they are now auto-approved
        return obj.registrations.count()

    def get_attended_count(self, obj):
        # Count registrations that have at least one attendance record or is_attended true
        return obj.registrations.filter(is_attended=True).count()

    def get_user_registration(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        
        reg = obj.registrations.filter(user=request.user).first()
        if reg:
            return {
                "id": reg.id,
                "status": reg.status,
                "unique_code": reg.unique_code,
                "qr_image": request.build_absolute_uri(reg.qr_image.url) if reg.qr_image else None,
                "is_attended": reg.is_attended,
                "attended_at": reg.attended_at,
            }
        return None
    
    def validate_form_fields(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Minimal harus ada 1 field pendaftaran (misal: Nama, No HP, dll).")
        return value
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ('created_by', 'slug', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        # Handle JSON strings sent via FormData (Multipart)
        import json
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        
        for field in ['form_fields', 'speakers', 'sessions']:
            if field in mutable_data and isinstance(mutable_data[field], str):
                try:
                    mutable_data[field] = json.loads(mutable_data[field])
                except (json.JSONDecodeError, TypeError):
                    pass
        
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        fields_data = validated_data.pop('form_fields', [])
        speakers_data = validated_data.pop('speakers', [])
        sessions_data = validated_data.pop('sessions', [])
        
        request = self.context.get('request')
        doc_images = request.FILES.getlist('documentation_images_upload') if request else []
        
        event = Event.objects.create(**validated_data)
        
        for field in fields_data:
            EventFormField.objects.create(event=event, **field)
            
        for spk in speakers_data:
            EventSpeaker.objects.create(event=event, **spk)
            
        for ses in sessions_data:
            EventSession.objects.create(event=event, **ses)
            
        from .models import EventDocumentationImage
        for img in doc_images:
            EventDocumentationImage.objects.create(event=event, image=img)
            
        return event

    def update(self, instance, validated_data):
        fields_data = validated_data.pop('form_fields', None)
        speakers_data = validated_data.pop('speakers', None)
        sessions_data = validated_data.pop('sessions', None)
        
        # Update event basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Sync form fields
        if fields_data is not None:
            existing_fields = {f.label.lower(): f for f in instance.form_fields.all()}
            new_field_ids = []
            for field_item in fields_data:
                field_item.pop('id', None)
                label = field_item.get('label', '').lower()
                if label in existing_fields:
                    field_obj = existing_fields[label]
                    for attr, val in field_item.items():
                        setattr(field_obj, attr, val)
                    field_obj.save()
                    new_field_ids.append(field_obj.id)
                else:
                    new_field = EventFormField.objects.create(event=instance, **field_item)
                    new_field_ids.append(new_field.id)
            instance.form_fields.exclude(id__in=new_field_ids).delete()

        # Sync speakers (just recreate for simplicity since no hard foreign keys depend on them)
        if speakers_data is not None:
            instance.speakers.all().delete()
            for spk in speakers_data:
                spk.pop('id', None)
                EventSpeaker.objects.create(event=instance, **spk)

        # Sync sessions
        if sessions_data is not None:
            existing_sessions = {s.title.lower(): s for s in instance.sessions.all()}
            new_sessions_ids = []
            for ses_item in sessions_data:
                ses_item.pop('id', None)
                title = ses_item.get('title', '').lower()
                if title in existing_sessions:
                    ses_obj = existing_sessions[title]
                    for attr, val in ses_item.items():
                        setattr(ses_obj, attr, val)
                    ses_obj.save()
                    new_sessions_ids.append(ses_obj.id)
                else:
                    new_ses = EventSession.objects.create(event=instance, **ses_item)
                    new_sessions_ids.append(new_ses.id)
            instance.sessions.exclude(id__in=new_sessions_ids).delete()
        
        # Handle new documentation images
        request = self.context.get('request')
        if request:
            doc_images = request.FILES.getlist('documentation_images_upload')
            from .models import EventDocumentationImage
            for img in doc_images:
                EventDocumentationImage.objects.create(event=instance, image=img)
        
        return instance

class EventRegistrationFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventRegistrationFile
        fields = ['id', 'field', 'file']

class EventRegistrationSerializer(serializers.ModelSerializer):
    uploaded_files = EventRegistrationFileSerializer(many=True, read_only=True)
    user_details = UserAdminSerializer(source='user', read_only=True)
    responses_with_labels = serializers.SerializerMethodField()
    attendances_list = EventAttendanceSerializer(source='attendances', many=True, read_only=True)

    class Meta:
        model = EventRegistration
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'status', 'unique_code', 'is_attended', 'attended_at')

    def get_responses_with_labels(self, obj):
        """Map response IDs to labels if possible, but also include orphaned data by label if we can guess it."""
        if not obj.responses:
            return {}
        
        result = {}
        # Get all fields currently associated with this event
        current_fields = {str(f.id): f.label for f in obj.event.form_fields.all()}
        # Reverse mapping for easy lookup by label
        label_to_current_id = {v: k for k, v in current_fields.items()}
        
        for field_id, value in obj.responses.items():
            label = current_fields.get(str(field_id))
            if label:
                result[label] = value
            else:
                # Orphaned ID. Maybe we can map it to a current label for Event 15?
                if obj.event_id == 15:
                    legacy_map = {'81': 'Nama', '82': 'Email', '83': 'No HP', '84': 'Asal Instansi', '85': 'Jenis Kelamin'}
                    mapped_label = legacy_map.get(str(field_id))
                    if mapped_label:
                        result[mapped_label] = value
                    else:
                        result[f"field_{field_id}"] = value
                else:
                    result[f"field_{field_id}"] = value
        return result
