import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from events.models import EventRegistration

ids = ['56', '57', '58', '59', '60', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75']
regs = EventRegistration.objects.all()

for r in regs:
    for fid in ids:
        if fid in r.responses and r.responses[fid]:
            print(f"ID {fid} has value: {r.responses[fid]} (Reg {r.id})")
            break
