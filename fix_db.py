import os
import subprocess
import base64

def run_cmd(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print(f"Success: {result.stdout}")

def main():
    print("Fixing database columns manually (Secure Base64 Method)...")
    if os.path.exists("barakah_app"):
        os.chdir("barakah_app")
    
    sql_commands = [
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS name_font_family VARCHAR(100) DEFAULT 'Roboto-Bold.ttf';",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS number_font_family VARCHAR(100) DEFAULT 'Roboto-Bold.ttf';",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS photo_height FLOAT DEFAULT 25.0;",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS photo_width FLOAT DEFAULT 20.0;",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS photo_x FLOAT DEFAULT 50.0;",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS photo_y FLOAT DEFAULT 30.0;",
        "ALTER TABLE events_eventbib ADD COLUMN IF NOT EXISTS show_photo BOOLEAN DEFAULT FALSE;"
    ]
    
    for sql in sql_commands:
        # Kode python yang akan dijalankan di dalam kontainer
        py_code = f"from django.db import connection; cursor = connection.cursor(); cursor.execute(\"{sql}\")"
        # Encode ke base64 agar aman dari gangguan tanda kutip terminal
        encoded_code = base64.b64encode(py_code.encode()).decode()
        
        # Jalankan di dalam docker
        cmd = f"docker compose exec -T backend python -c \"import base64; exec(base64.b64decode('{encoded_code}'))\""
        run_cmd(cmd)

    print("\nMarking migration as faked...")
    run_cmd("docker compose exec -T backend python manage.py migrate events 0024 --fake")
    
    print("\nDatabase fix complete! Silakan coba pengajuan event lagi.")

if __name__ == "__main__":
    main()
