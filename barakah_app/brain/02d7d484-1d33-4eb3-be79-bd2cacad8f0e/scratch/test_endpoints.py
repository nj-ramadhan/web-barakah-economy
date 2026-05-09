
import os
import sys
import django

# Add backend to sys.path
backend_path = os.path.abspath('barakah_app/backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from events.views import EventViewSet
from django.contrib.auth import get_user_model

User = get_user_model()

def test_my_events():
    factory = APIRequestFactory()
    view = EventViewSet.as_view({'get': 'my_events'})
    
    # Test with a user who might have NO custom roles
    user = User.objects.filter(role='user').first()
    if not user:
        user = User.objects.create_user(username='testuser_noroles', email='test@example.com', password='password')
    
    print(f"Testing my_events for user: {user.username} (Roles: {list(user.custom_roles.all())})")
    
    request = factory.get('/api/events/my_events/')
    force_authenticate(request, user=user)
    
    try:
        response = view(request)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Response Data: {response.data}")
    except Exception as e:
        import traceback
        print(f"FAILED with exception: {e}")
        print(traceback.format_exc())

def test_registrations():
    from events.views import EventRegistrationViewSet
    factory = APIRequestFactory()
    view = EventRegistrationViewSet.as_view({'get': 'list'})
    
    # Get an event creator
    from events.models import Event
    event = Event.objects.first()
    if not event:
        print("No events found.")
        return
        
    user = event.created_by
    print(f"Testing registrations/list for user: {user.username} (Event creator)")
    
    request = factory.get('/api/events/registrations/', {'event': event.id})
    force_authenticate(request, user=user)
    
    try:
        response = view(request)
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Response Data: {response.data}")
        else:
            print(f"Success! Found {len(response.data) if isinstance(response.data, list) else response.data.get('count', 0)} registrations.")
    except Exception as e:
        import traceback
        print(f"FAILED with exception: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    print("--- Testing my_events ---")
    test_my_events()
    print("\n--- Testing registrations/list ---")
    test_registrations()
