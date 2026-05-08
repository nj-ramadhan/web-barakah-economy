from django.db import migrations, models

def add_missing_columns(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        # Check current columns
        if connection.vendor == 'postgresql':
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'events_eventbib'")
            columns = [row[0] for row in cursor.fetchall()]
        elif connection.vendor == 'sqlite':
            cursor.execute("PRAGMA table_info(events_eventbib)")
            columns = [row[1] for row in cursor.fetchall()]
        else:
            return

        missing_columns = {
            'name_font_family': "VARCHAR(100) DEFAULT 'Roboto-Bold.ttf' NOT NULL",
            'number_font_family': "VARCHAR(100) DEFAULT 'Roboto-Bold.ttf' NOT NULL",
            'photo_height': "DOUBLE PRECISION DEFAULT 25.0 NOT NULL" if connection.vendor == 'postgresql' else "REAL DEFAULT 25.0 NOT NULL",
            'photo_width': "DOUBLE PRECISION DEFAULT 20.0 NOT NULL" if connection.vendor == 'postgresql' else "REAL DEFAULT 20.0 NOT NULL",
            'photo_x': "DOUBLE PRECISION DEFAULT 50.0 NOT NULL" if connection.vendor == 'postgresql' else "REAL DEFAULT 50.0 NOT NULL",
            'photo_y': "DOUBLE PRECISION DEFAULT 30.0 NOT NULL" if connection.vendor == 'postgresql' else "REAL DEFAULT 30.0 NOT NULL",
            'show_photo': "BOOLEAN DEFAULT FALSE NOT NULL" if connection.vendor == 'postgresql' else "INTEGER DEFAULT 0 NOT NULL"
        }
        
        for col, definition in missing_columns.items():
            if col not in columns:
                try:
                    cursor.execute(f"ALTER TABLE events_eventbib ADD COLUMN {col} {definition}")
                except Exception:
                    pass # Already exists or other error

class Migration(migrations.Migration):

    dependencies = [
        ('events', '0024_eventbib_name_font_family_and_more'),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, reverse_code=migrations.RunPython.noop),
    ]
