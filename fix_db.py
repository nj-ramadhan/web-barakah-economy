import os
import subprocess

def run_cmd(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print(f"Success: {result.stdout}")

def main():
    print("Fixing database columns manually...")
    # Pastikan berada di folder project utama agar bisa menemukan barakah_app
    if os.path.exists("barakah_app"):
        os.chdir("barakah_app")
    
    # Perintah SQL untuk menambahkan kolom yang hilang jika belum ada
    # Menggunakan IF NOT EXISTS agar tidak error jika kolom sudah ada
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
        # Perintah dbshell untuk menjalankan SQL langsung ke Postgres di dalam Docker
        cmd = f'docker compose exec -T backend python manage.py dbshell --command "{sql}"'
        run_cmd(cmd)

    # Pastikan migrasi ditandai selesai agar Django tidak mencoba menjalankannya lagi
    print("\nMarking migration as faked...")
    run_cmd("docker compose exec -T backend python manage.py migrate events 0024 --fake")
    
    print("\nDatabase fix complete! Silakan coba pengajuan event lagi.")

if __name__ == "__main__":
    main()
