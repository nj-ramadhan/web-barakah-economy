import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import Event, EventRegistration

events = Event.objects.all()
for e in events:
    registrations = EventRegistration.objects.filter(event=e)
    approved = registrations.filter(status='approved')
    print(f"Event: {e.title} (slug: {e.slug})")
    print(f"  Total Registrations: {registrations.count()}")
    print(f"  Approved: {approved.count()}")
    for reg in approved:
        print(f"    - Participant: {reg.guest_name or (reg.user.username if reg.user else 'Guest')} (ID: {reg.id})")
