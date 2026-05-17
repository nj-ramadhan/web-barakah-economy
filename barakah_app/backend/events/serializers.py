from rest_framework import serializers
from .models import (
    Event, EventFormField, EventRegistration, EventRegistrationFile, 
    EventDocumentationImage, EventGalleryImage, EventCertificate, 
    EventBib, EventSpecialQR, EventPriceVariation
)
from accounts.serializers import UserAdminSerializer, UserLabelSerializer, UserSimpleSerializer
from accounts.models import UserLabel
from django.db import transaction

class EventFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventFormField
        fields = ['id', 'label', 'field_type', 'required', 'options', 'placeholder', 'order']

class EventDocumentationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDocumentationImage
        fields = ['id', 'image', 'created_at']

class EventGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventGalleryImage
        fields = ['id', 'image', 'created_at']

from .models import EventSpeaker, EventSession, EventAttendance

class EventSpeakerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSpeaker
        fields = ['id', 'name', 'role', 'photo', 'link', 'order']

    def to_internal_value(self, data):
        # Handle cases where photo might be a URL string during edit
        if 'photo' in data and isinstance(data['photo'], str) and data['photo'].startswith('http'):
            # It's an existing URL, we don't want to try and save it as a new file
            # Remove it so the model doesn't try to save a string as an image
            data = data.copy()
            data.pop('photo')
        
        # Handle empty strings for optional fields
        for field in ['role', 'link']:
            if field in data and data[field] == '':
                if not hasattr(data, 'copy'): data = data.copy()
                data[field] = None
                
        return super().to_internal_value(data)

class EventSessionSerializer(serializers.ModelSerializer):
    attendance_count = serializers.SerializerMethodField()
    class Meta:
        model = EventSession
        fields = ['id', 'title', 'start_time', 'end_time', 'order', 'attendance_count', 'is_finished']

    def to_internal_value(self, data):
        # Handle empty strings for datetime fields
        for field in ['start_time', 'end_time']:
            if field in data and data[field] == '':
                data = data.copy() if hasattr(data, 'copy') else data
                data[field] = None
        return super().to_internal_value(data)

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

class EventBibSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventBib
        fields = '__all__'

class EventSpecialQRSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventSpecialQR
        fields = '__all__'


class EventPriceVariationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPriceVariation
        fields = ['id', 'title', 'price', 'benefits', 'order']

class EventSerializer(serializers.ModelSerializer):
    created_by_details = UserSimpleSerializer(source='created_by', read_only=True)
    form_fields = EventFormFieldSerializer(many=True, required=False)
    documentation_images = EventDocumentationImageSerializer(many=True, read_only=True)
    gallery_images = EventGalleryImageSerializer(many=True, read_only=True)
    speakers = EventSpeakerSerializer(many=True, required=False)
    sessions = EventSessionSerializer(many=True, required=False)
    committees_details = serializers.SerializerMethodField()
    registration_count = serializers.SerializerMethodField()
    attended_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    free_for_labels = UserLabelSerializer(many=True, read_only=True)
    free_for_label_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=UserLabel.objects.all(), write_only=True, required=False, source='free_for_labels'
    )
    price_variations = EventPriceVariationSerializer(many=True, required=False)
    user_registration = serializers.SerializerMethodField()
    certificate = serializers.SerializerMethodField()
    bib_template = serializers.SerializerMethodField()
    special_qr = serializers.SerializerMethodField()

    def get_bib_template(self, obj):
        try:
            from .models import EventBib
            from .serializers import EventBibSerializer
            bib = EventBib.objects.filter(event=obj).first()
            if bib:
                # If migration is pending, accessing fields might fail
                return EventBibSerializer(bib, context=self.context).data
            return None
        except Exception as e:
            # Log the error but don't fail the whole request
            print(f"BIB serialization error (likely pending migrations): {e}")
            return None

    def get_certificate(self, obj):
        try:
            from .models import EventCertificate
            from .serializers import EventCertificateSerializer
            cert = EventCertificate.objects.filter(event=obj).first()
            if cert:
                return EventCertificateSerializer(cert, context=self.context).data
            return None
        except Exception:
            return None

    def get_special_qr(self, obj):
        try:
            from .models import EventSpecialQR
            from .serializers import EventSpecialQRSerializer
            special_qr = EventSpecialQR.objects.filter(event=obj).first()
            if special_qr:
                return EventSpecialQRSerializer(special_qr, context=self.context).data
            return None
        except Exception:
            return None

    def get_registration_count(self, obj):
        try:
            return obj.registrations.count()
        except Exception:
            return 0

    def get_attended_count(self, obj):
        try:
            return obj.registrations.filter(is_attended=True).count()
        except Exception:
            return 0

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_committees_details(self, obj):
        try:
            from accounts.serializers import UserSimpleSerializer
            return UserSimpleSerializer(obj.committees.all(), many=True, context=self.context).data
        except Exception:
            return []

    def get_user_registration(self, obj):
        try:
            request = self.context.get('request')
            if not request or not request.user or not request.user.is_authenticated:
                return None
            
            reg = obj.registrations.filter(user=request.user).first()
            if reg:
                return {
                    "id": reg.id,
                    "status": reg.status,
                    "unique_code": reg.unique_code,
                    "qr_image": request.build_absolute_uri(reg.qr_image.url) if reg.qr_image and hasattr(reg.qr_image, 'url') else None,
                    "is_attended": reg.is_attended,
                    "attended_at": reg.attended_at,
                }
        except Exception:
            pass
        return None
    
    def validate_form_fields(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("Minimal harus ada 1 field pendaftaran (misal: Nama, No HP, dll).")
        return value
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ('created_by', 'slug', 'created_at', 'updated_at')

    def calamities_cleanup(self, data):
        """Standardize empty strings to None for numeric and datetime fields."""
        numeric_fields = ['capacity', 'price_fixed']
        datetime_fields = ['start_date', 'end_date', 'visible_at', 'registration_start_at']
        
        for field in numeric_fields:
            if field in data and (data[field] == '' or data[field] == 'null'):
                data[field] = 0 if field == 'price_fixed' else None
        
        for field in datetime_fields:
            if field in data and (data[field] == '' or data[field] == 'null'):
                data[field] = None
        return data

    def to_internal_value(self, data):
        # Handle JSON strings sent via FormData (Multipart)
        import json
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        
        # Clean up empty strings for numbers/dates
        mutable_data = self.calamities_cleanup(mutable_data)
        
        for field in ['form_fields', 'speakers', 'sessions', 'price_variations']:
            if field in mutable_data and isinstance(mutable_data[field], str):
                try:
                    stripped = mutable_data[field].strip()
                    if stripped and stripped != 'null' and stripped != 'undefined':
                        mutable_data[field] = json.loads(stripped)
                    else:
                        mutable_data[field] = []
                except (json.JSONDecodeError, TypeError):
                    mutable_data[field] = []
        
        return super().to_internal_value(mutable_data)

    @transaction.atomic
    def create(self, validated_data):
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        
        try:
            fields_data = validated_data.pop('form_fields', [])
            speakers_data = validated_data.pop('speakers', [])
            sessions_data = validated_data.pop('sessions', [])
            price_variations_data = validated_data.pop('price_variations', [])
            free_for_labels_data = validated_data.pop('free_for_labels', [])
            committees_data = validated_data.pop('committees', [])
            
            request = self.context.get('request')
            doc_images = request.FILES.getlist('documentation_images_upload') if request else []
            gallery_images = request.FILES.getlist('gallery_images_upload') if request else []
            
            with transaction.atomic():
                # Pop many-to-many and nested fields to handle separately
                # Ensure created_by is present (it should be added via perform_create -> save(created_by=user))
                created_by = validated_data.pop('created_by', None)
                if not created_by and request:
                    created_by = request.user
                
                if not created_by:
                    raise serializers.ValidationError({"created_by": "User pembuat event tidak ditemukan."})

                event = Event.objects.create(created_by=created_by, **validated_data)
                
                if free_for_labels_data:
                    event.free_for_labels.set(free_for_labels_data)
                if committees_data:
                    event.committees.set(committees_data)
                
                # Handle Form Fields
                for field in fields_data:
                    EventFormField.objects.create(event=event, **field)
                
                # Handle Speakers
                for spk in speakers_data:
                    EventSpeaker.objects.create(event=event, **spk)
                    
                # Handle Sessions
                for ses in sessions_data:
                    EventSession.objects.create(event=event, **ses)

                # Handle Price Variations
                for var in price_variations_data:
                    EventPriceVariation.objects.create(event=event, **var)
                
            from .models import EventDocumentationImage, EventGalleryImage
            logger.info(f"Creating documentation images: {len(doc_images)}")
            for img in doc_images:
                EventDocumentationImage.objects.create(event=event, image=img)
                
            logger.info(f"Creating gallery images: {len(gallery_images)}")
            for img in gallery_images:
                EventGalleryImage.objects.create(event=event, image=img)
                
            # Handle BIB Template Image if provided
            bib_image = request.FILES.get('bib_template_image') if request else None
            if bib_image or event.has_bib:
                try:
                    logger.info("Handling BIB Template")
                    bib, _ = EventBib.objects.get_or_create(event=event)
                    if bib_image:
                        bib.template_image = bib_image
                        bib.is_active = True
                        bib.save()
                except Exception as bib_err:
                    logger.error(f"Failed to create/get EventBib: {str(bib_err)}")
                    # We don't want to fail the whole event creation just because BIB config failed
                    # but we should at least log it.
                
            return event
        except Exception as e:
            logger.error(f"Error in EventSerializer.create: {str(e)}\n{traceback.format_exc()}")
            raise e

    @transaction.atomic
    def update(self, instance, validated_data):
        # M2M fields must be handled separately
        free_for_labels_data = validated_data.pop('free_for_labels', None)
        committees_data = validated_data.pop('committees', None)
        fields_data = validated_data.pop('form_fields', None)
        speakers_data = validated_data.pop('speakers', None)
        sessions_data = validated_data.pop('sessions', None)
        price_variations_data = validated_data.pop('price_variations', None)
        
        # Update event basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if free_for_labels_data is not None:
            instance.free_for_labels.set(free_for_labels_data)
        if committees_data is not None:
            instance.committees.set(committees_data)
        
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
        
        # Sync price variations
        if price_variations_data is not None:
            existing_vars = {v.title.lower(): v for v in instance.price_variations.all()}
            new_var_ids = []
            for var_item in price_variations_data:
                var_item.pop('id', None)
                title = var_item.get('title', '').lower()
                if title in existing_vars:
                    var_obj = existing_vars[title]
                    for attr, val in var_item.items():
                        setattr(var_obj, attr, val)
                    var_obj.save()
                    new_var_ids.append(var_obj.id)
                else:
                    new_var = EventPriceVariation.objects.create(event=instance, **var_item)
                    new_var_ids.append(new_var.id)
            instance.price_variations.exclude(id__in=new_var_ids).delete()

        # Handle new documentation images
        request = self.context.get('request')
        if request:
            doc_images = request.FILES.getlist('documentation_images_upload')
            gallery_images = request.FILES.getlist('gallery_images_upload')
            from .models import EventDocumentationImage, EventGalleryImage
            for img in doc_images:
                EventDocumentationImage.objects.create(event=instance, image=img)
            for img in gallery_images:
                EventGalleryImage.objects.create(event=instance, image=img)
            
            # Handle BIB Template Image
            bib_image = request.FILES.get('bib_template_image')
            if bib_image or instance.has_bib:
                try:
                    bib, _ = EventBib.objects.get_or_create(event=instance)
                    if bib_image:
                        bib.template_image = bib_image
                        bib.is_active = True
                        bib.save()
                except Exception as bib_err:
                    logger.error(f"Failed to update EventBib: {str(bib_err)}")
        
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
    formatted_bib = serializers.SerializerMethodField()
    price_variation_details = EventPriceVariationSerializer(source='price_variation', read_only=True)

    def get_formatted_bib(self, obj):
        if not obj.bib_number:
            return None
        
        # Get format from template
        try:
            template = obj.event.bib_template
            fmt = template.number_format
            if fmt:
                return str(obj.bib_number).zfill(len(fmt))
        except:
            pass
        return str(obj.bib_number).zfill(3) # Default 001

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
        
        # Collect unknown IDs to query them globally
        unknown_ids = [fid for fid in obj.responses.keys() if str(fid) not in current_fields]
        extra_labels = {}
        if unknown_ids:
            try:
                # Try to find these IDs globally in case they were orphaned/moved
                from .models import EventFormField
                extra_fields = EventFormField.objects.filter(id__in=unknown_ids)
                extra_labels = {str(f.id): f.label for f in extra_fields}
            except:
                pass

        for field_id, value in obj.responses.items():
            fid_str = str(field_id)
            label = current_fields.get(fid_str) or extra_labels.get(fid_str)
            
            if not label:
                # Manual fallback for known orphaned IDs from previous event versions
                manual_map = {
                    '56': 'Domisili/Kota',
                    '57': 'Profesi/Pekerjaan',
                    '58': 'Alasan Mengikuti',
                    '59': 'Ekspektasi/Harapan',
                    '60': 'Sumber Informasi',
                    '66': 'LinkedIn',
                    '67': 'Instagram',
                    '68': 'Facebook',
                    '69': 'TikTok',
                    '70': 'Website',
                    '71': 'WhatsApp',
                    '72': 'Email Cadangan',
                    '73': 'Nama Panggilan',
                    '74': 'Hobi',
                    '75': 'Catatan Khusus',
                    '81': 'Nama', 
                    '82': 'Email', 
                    '83': 'No HP', 
                    '84': 'Asal Instansi', 
                    '85': 'Jenis Kelamin'
                }
                label = manual_map.get(fid_str)

            if label:
                result[label] = value
            else:
                result[f"field_{field_id}"] = value
        return result
