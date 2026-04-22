
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import Event

event_id = 15
event = Event.objects.get(id=event_id)
print(f"EVENT: {event.title}")
for f in event.form_fields.all():
    print(f"ID={f.id} LABEL='{f.label}'")
