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
    print("Fixing database migration conflict...")
    # Navigate to barakah_app directory
    os.chdir("barakah_app")
    
    # Fake the problematic migration
    run_cmd("docker compose exec -T backend python manage.py migrate events 0024 --fake")
    
    # Run the rest of migrations
    run_cmd("docker compose exec -T backend python manage.py migrate")
    
    print("Database fix complete!")

if __name__ == "__main__":
    main()
