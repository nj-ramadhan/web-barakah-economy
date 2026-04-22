import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from django.db import connection
from events.models import Event

def check():
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'events_event'")
        columns = [row[0] for row in cursor.fetchall()]
        print("Columns in events_event:")
        for col in sorted(columns):
            print(f"- {col}")
        
        expected = [
            'attachment_file', 'attachment_file_title', 
            'attachment_link', 'attachment_link_title',
            'capacity', 'visibility', 'terms_do', 'terms_dont'
        ]
        
        missing = [e for e in expected if e not in columns]
        if missing:
            print("\nMISSING COLUMNS:")
            for m in missing:
                print(f"!!! {m}")
        else:
            print("\nAll expected columns are present.")

        # Check tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row[0] for row in cursor.fetchall()]
        expected_tables = ['events_eventsession', 'events_eventspeaker', 'events_eventattendance']
        missing_tables = [t for t in expected_tables if t not in tables]
        if missing_tables:
            print("\nMISSING TABLES:")
            for mt in missing_tables:
                print(f"!!! {mt}")
        else:
            print("\nAll expected tables are present.")

if __name__ == "__main__":
    check()
