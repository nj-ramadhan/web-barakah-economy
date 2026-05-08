import os
import sys
import django
import json

# Set up Django environment
sys.path.append('d:/Galang/BAE/website/web bae/web-barakah-economy/barakah_app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from django.contrib.auth import get_user_model
from events.serializers import EventSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()

def test_event_creation_with_empty_sessions():
    user = User.objects.first()
    if not user:
        user = User.objects.create_user(username='testuser', password='password123')
        print("Created temporary user for testing.")

    # Problematic data: empty start_time and end_time for a session
    data = {
        'title': 'Test Event robust',
        'description': 'Test description',
        'start_date': '2026-05-10T10:00:00Z',
        'location': 'Test Location',
        'organizer_name': 'Test Organizer',
        'organizer_contact': '0812345678',
        'form_fields': [
            {'label': 'Nama', 'field_type': 'text', 'required': True, 'order': 0}
        ],
        'sessions': [
            {'title': 'Sesi Kosong', 'start_time': '', 'end_time': '', 'order': 0}
        ],
        'has_bib': True
    }

    print("Testing event creation with empty session dates...")
    serializer = EventSerializer(data=data, context={'request': None})
    
    try:
        if serializer.is_valid():
            print("Validation successful (this is what we want after the fix!)")
            # We don't actually want to save to the DB in this script if possible,
            # but let's see if we can.
            try:
                # Mock request.user
                event = serializer.save(created_by=user)
                print(f"Event created successfully: {event.title} (Slug: {event.slug})")
                # Clean up
                event.delete()
                print("Test event deleted.")
            except Exception as e:
                print(f"Creation failed during save: {e}")
        else:
            print("Validation failed:")
            print(json.dumps(serializer.errors, indent=2))
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == '__main__':
    test_event_creation_with_empty_sessions()
