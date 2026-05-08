import os
import sys
import django
from django.db import connection

# Set up Django
sys.path.append('d:/Galang/BAE/website/web bae/web-barakah-economy/barakah_app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

def fix_db():
    engine = connection.vendor
    print(f"Database engine: {engine}")
    
    with connection.cursor() as cursor:
        if engine == 'postgresql':
            print("Checking events_eventbib columns in PostgreSQL...")
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'events_eventbib'")
            columns = [row[0] for row in cursor.fetchall()]
        elif engine == 'sqlite':
            print("Checking events_eventbib columns in SQLite...")
            cursor.execute("PRAGMA table_info(events_eventbib)")
            columns = [row[1] for row in cursor.fetchall()]
        else:
            print(f"Unsupported engine for manual fix: {engine}")
            return

        print(f"Current columns: {columns}")
        
        missing_columns = {
            'name_font_family': "VARCHAR(100) DEFAULT 'Roboto-Bold.ttf' NOT NULL",
            'number_font_family': "VARCHAR(100) DEFAULT 'Roboto-Bold.ttf' NOT NULL",
            'photo_height': "DOUBLE PRECISION DEFAULT 25.0 NOT NULL" if engine == 'postgresql' else "REAL DEFAULT 25.0 NOT NULL",
            'photo_width': "DOUBLE PRECISION DEFAULT 20.0 NOT NULL" if engine == 'postgresql' else "REAL DEFAULT 20.0 NOT NULL",
            'photo_x': "DOUBLE PRECISION DEFAULT 50.0 NOT NULL" if engine == 'postgresql' else "REAL DEFAULT 50.0 NOT NULL",
            'photo_y': "DOUBLE PRECISION DEFAULT 30.0 NOT NULL" if engine == 'postgresql' else "REAL DEFAULT 30.0 NOT NULL",
            'show_photo': "BOOLEAN DEFAULT FALSE NOT NULL" if engine == 'postgresql' else "INTEGER DEFAULT 0 NOT NULL"
        }
        
        for col, definition in missing_columns.items():
            if col not in columns:
                print(f"Adding column {col}...")
                try:
                    cursor.execute(f"ALTER TABLE events_eventbib ADD COLUMN {col} {definition}")
                    print(f"Successfully added {col}")
                except Exception as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column {col} already exists.")

if __name__ == '__main__':
    fix_db()
