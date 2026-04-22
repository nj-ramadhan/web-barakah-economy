import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from django.db import connection, TableNames
from django.db.models.fields import CharField, IntegerField, TextField, URLField, DateTimeField, PositiveIntegerField
from django.db.models import FileField, ImageField, ForeignKey, CASCADE, SET_NULL
from events.models import Event, EventRegistration, EventSession, EventSpeaker, EventAttendance
from django.conf import settings

def repair():
    with connection.schema_editor() as schema_editor:
        # 1. Check and add columns to 'events_event'
        # These are the ones that were problematic
        table_name = 'events_event'
        
        # Get current columns
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")
            existing_columns = [row[0] for row in cursor.fetchall()]

        print(f"Checking columns in {table_name}...")
        
        # Define fields to check
        fields_to_add = [
            ('attachment_file', FileField(blank=True, null=True, upload_to='events/attachments/')),
            ('attachment_file_title', CharField(blank=True, max_length=100, null=True)),
            ('attachment_link', URLField(blank=True, null=True)),
            ('attachment_link_title', CharField(blank=True, max_length=100, null=True)),
            ('capacity', IntegerField(blank=True, default=0, null=True)),
            ('visibility', CharField(default='public', max_length=10)),
            ('terms_do', TextField(blank=True, null=True)),
            ('terms_dont', TextField(blank=True, null=True)),
            ('documentation_frame_1_1', ImageField(blank=True, null=True, upload_to='events/frames/')),
        ]

        for name, field in fields_to_add:
            if name not in existing_columns:
                print(f"Adding column: {name}")
                field.set_attributes_from_name(name)
                schema_editor.add_field(Event, field)
            else:
                print(f"Column already exists: {name}")

        # 2. Check and Create Tables
        tables = connection.introspection.table_names()
        
        # EventSession
        if 'events_eventsession' not in tables:
            print("Creating table: events_eventsession")
            schema_editor.create_model(EventSession)
        else:
            print("Table exists: events_eventsession")

        # EventSpeaker
        if 'events_eventspeaker' not in tables:
            print("Creating table: events_eventspeaker")
            schema_editor.create_model(EventSpeaker)
        else:
            print("Table exists: events_eventspeaker")

        # EventAttendance
        if 'events_eventattendance' not in tables:
            print("Creating table: events_eventattendance")
            schema_editor.create_model(EventAttendance)
        else:
            print("Table exists: events_eventattendance")

    print("\n--- Repair Finished! ---")

if __name__ == "__main__":
    try:
        repair()
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
