import os
import sys
import django

# Set up Django environment
sys.path.append('d:/Galang/BAE/website/web bae/web-barakah-economy/barakah_app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from django.db import connection
from events.models import EventBib

def check_columns():
    cursor = connection.cursor()
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'events_eventbib'")
    columns = [row[0] for row in cursor.fetchall()]
    print("Columns in events_eventbib:", columns)
    
    # Also check if we can access the fields via ORM
    try:
        fields = [f.name for f in EventBib._meta.get_fields()]
        print("Model fields:", fields)
        
        # Try to query one
        bib = EventBib.objects.first()
        if bib:
            print("Successfully accessed EventBib object")
        else:
            print("No EventBib objects found")
    except Exception as e:
        print("Error accessing EventBib:", e)

if __name__ == '__main__':
    check_columns()
