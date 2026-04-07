from rest_framework import serializers
from .models import Event, EventFormField, EventRegistration, EventRegistrationFile
from accounts.serializers import UserAdminSerializer

class EventFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventFormField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'placeholder', 'order']

class EventSerializer(serializers.ModelSerializer):
    created_by_details = UserAdminSerializer(source='created_by', read_only=True)
    form_fields = EventFormFieldSerializer(many=True, required=False)
    registration_count = serializers.IntegerField(source='registrations.count', read_only=True)
    
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
        event = Event.objects.create(**validated_data)
        for field in fields_data:
            EventFormField.objects.create(event=event, **field)
        return event

    def update(self, instance, validated_data):
        fields_data = validated_data.pop('form_fields', None)
        
        # Update event basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update fields if provided
        if fields_data is not None:
            # Simple approach: delete old fields and re-create
            # Real-world might need tracking IDs to avoid deleting everything
            instance.form_fields.all().delete()
            for field in fields_data:
                EventFormField.objects.create(event=instance, **field)
        
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
