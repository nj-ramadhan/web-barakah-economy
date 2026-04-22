
import os
import django
import json

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import Event, EventRegistration

event_id = 15
event = Event.objects.get(id=event_id)
print(f"Event: {event.title} (ID: {event_id})")

print("\nCurrent Form Fields:")
for field in event.form_fields.all():
    print(f"ID: {field.id}, Label: {field.label}")

print("\nRegistration Responses Keys Summary:")
regs = EventRegistration.objects.filter(event=event)
all_keys = set()
for reg in regs:
    if reg.responses:
        all_keys.update(reg.responses.keys())

print(f"All keys found in responses for this event: {all_keys}")

# Sample some registrations with 'old' keys
print("\nSample registrations with potentially old keys:")
for reg in regs:
    has_old = any(k not in [str(f.id) for f in event.form_fields.all()] for k in reg.responses.keys())
    if has_old:
        print(f"Reg ID {reg.id}: {reg.responses}")
