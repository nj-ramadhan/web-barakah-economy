import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import EventRegistration, EventFormField

target_ids = ['56', '57', '58', '59', '60', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75']
regs = EventRegistration.objects.all()
count = 0

print("--- ANALYZING UNKNOWN FIELDS ---")
for r in regs:
    found_ids = [k for k in r.responses.keys() if str(k) in target_ids]
    if found_ids:
        print(f"Reg ID: {r.id} | Event: {r.event.title}")
        for fid in found_ids:
            val = r.responses[fid]
            print(f"  Field {fid}: {val}")
        count += 1
        if count > 5: break

print("\n--- CHECKING DB FOR THESE IDS ---")
for fid in target_ids:
    f = EventFormField.objects.filter(id=int(fid)).first()
    if f:
        print(f"ID {fid}: {f.label} (Event: {f.event.title})")
    else:
        print(f"ID {fid}: NOT FOUND IN DB")
