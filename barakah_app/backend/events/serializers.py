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
                "status": reg.status
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
            # Delete old fields
            instance.form_fields.all().delete()
            # Re-create fields (ignore IDs from frontend to avoid conflicts)
            for field in fields_data:
                field.pop('id', None) # Remove ID if present
                EventFormField.objects.create(event=instance, **field)
        
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

    class Meta:
        model = EventRegistration
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'status')
