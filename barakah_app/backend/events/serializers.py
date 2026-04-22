from rest_framework import serializers
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile, EventDocumentationImage
from accounts.serializers import UserAdminSerializer

class EventFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventFormField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'placeholder', 'order']

class EventDocumentationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDocumentationImage
        fields = ['id', 'image', 'created_at']

class EventSerializer(serializers.ModelSerializer):
    created_by_details = UserAdminSerializer(source='created_by', read_only=True)
    form_fields = EventFormFieldSerializer(many=True, required=False)
    documentation_images = EventDocumentationImageSerializer(many=True, read_only=True)
    registration_count = serializers.SerializerMethodField()
    user_registration = serializers.SerializerMethodField()

    def get_registration_count(self, obj):
        # Count all registrations as they are now auto-approved
        return obj.registrations.count()

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

    def create(self, validated_data):
        fields_data = validated_data.pop('form_fields', [])
        # Extract documentation images from request if available since they are not in validated_data (sent as extra files)
        request = self.context.get('request')
        doc_images = request.FILES.getlist('documentation_images_upload') if request else []
        
        event = Event.objects.create(**validated_data)
        
        for field in fields_data:
            EventFormField.objects.create(event=event, **field)
            
        from .models import EventDocumentationImage
        for img in doc_images:
            EventDocumentationImage.objects.create(event=event, image=img)
            
        return event

    def update(self, instance, validated_data):
        fields_data = validated_data.pop('form_fields', None)
        
        # Update event basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update fields if provided
        if fields_data is not None:
            # Get existing fields for this event
            existing_fields = {f.label.lower(): f for f in instance.form_fields.all()}
            new_field_ids = []
            
            for field_item in fields_data:
                # Remove ID if present to avoid manual injection
                field_item.pop('id', None)
                label = field_item.get('label', '').lower()
                
                if label in existing_fields:
                    # Update existing field
                    field_obj = existing_fields[label]
                    for attr, val in field_item.items():
                        setattr(field_obj, attr, val)
                    field_obj.save()
                    new_field_ids.append(field_obj.id)
                else:
                    # Create new field
                    new_field = EventFormField.objects.create(event=instance, **field_item)
                    new_field_ids.append(new_field.id)
            
            # Delete fields that are no longer in the new list
            instance.form_fields.exclude(id__in=new_field_ids).delete()
        
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
