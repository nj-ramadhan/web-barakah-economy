import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from django.db import connection

def check():
    cursor = connection.cursor()
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'events_eventattendance'")
    columns = [r[0] for r in cursor.fetchall()]
    print(f"Columns in events_eventattendance: {columns}")
    
    from events.models import EventAttendance
    count = EventAttendance.objects.count()
    print(f"Total attendance records: {count}")
    
    if count > 0:
        latest = EventAttendance.objects.latest('id')
        print(f"Latest record session: {latest.session}")
        print(f"Latest record registration_id: {latest.registration_id}")

if __name__ == "__main__":
    check()
