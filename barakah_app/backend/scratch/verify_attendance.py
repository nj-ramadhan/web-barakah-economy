import os
import django
import json
from django.utils import timezone
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_backend.settings')
django.setup()

from events.models import Event, EventRegistration, EventSession, EventAttendance
from events.views import EventViewSet

User = get_user_model()

def test_attendance():
    # 1. Setup
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        print("No admin user found. Creating one...")
        admin = User.objects.create_superuser('testadmin', 'admin@test.com', 'password')

    event = Event.objects.first()
    if not event:
        print("No event found. Create one first.")
        return

    # Add sessions if none
    if event.sessions.count() == 0:
        EventSession.objects.create(event=event, title="Sesi 1", order=1)
        EventSession.objects.create(event=event, title="Sesi 2", order=2)
    
    sessions = event.sessions.all()
    
    # Create a registration
    reg, created = EventRegistration.objects.get_or_create(
        event=event,
        unique_code='TESTSCAN',
        defaults={'guest_name': 'Tester Scan', 'status': 'approved'}
    )
    reg.is_attended = False
    reg.save()
    EventAttendance.objects.filter(registration=reg).delete()

    print(f"Testing attendance for event: {event.title}")
    
    # 2. Mock Scan Session 1
    view = EventViewSet.as_view({'post': 'scan_attendance'})
    factory = RequestFactory()
    
    data1 = {'unique_code': 'TESTSCAN', 'session_id': sessions[0].id}
    request1 = factory.post(f'/api/events/{event.slug}/scan_attendance/', data=data1, content_type='application/json')
    request1.user = admin
    
    print(f"Scanning Session 1: {sessions[0].title}")
    response1 = view(request1, slug=event.slug)
    print(f"Response 1: {response1.status_code} - {response1.data.get('message')}")

    # 3. Mock Scan Session 2 (Should succeed now!)
    data2 = {'unique_code': 'TESTSCAN', 'session_id': sessions[1].id}
    request2 = factory.post(f'/api/events/{event.slug}/scan_attendance/', data=data2, content_type='application/json')
    request2.user = admin
    
    print(f"Scanning Session 2: {sessions[1].title}")
    response2 = view(request2, slug=event.slug)
    print(f"Response 2: {response2.status_code} - {response2.data.get('message')}")

    # 4. Check results
    attendances = EventAttendance.objects.filter(registration=reg).count()
    print(f"Total attendance records for TESTSCAN: {attendances} (Expected: 2)")

if __name__ == "__main__":
    test_attendance()
