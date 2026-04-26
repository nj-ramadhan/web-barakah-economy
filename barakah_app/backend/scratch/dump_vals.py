import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import EventRegistration

target_ids = ['56', '57', '58', '59', '60', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75']
regs = EventRegistration.objects.all()

print("--- DATA ANALYSIS ---")
for r in regs:
    found = {fid: r.responses[fid] for fid in target_ids if fid in r.responses}
    if any(found.values()):
        print(f"Reg {r.id} (Event: {r.event.title}): {found}")
