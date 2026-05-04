import os
import sys
import django

# Set up Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')

# Load local env
from pathlib import Path
import environ
env = environ.Env()
environ.Env.read_env('.env.local')

django.setup()

from courses.models import Course

courses = Course.objects.all()
print(f"{'ID':<5} | {'Title':<40} | {'Slug'}")
print("-" * 100)
for c in courses:
    print(f"{c.id:<5} | {c.title:<40} | {c.slug}")

# Check for duplicates
slugs = [c.slug for c in courses if c.slug]
duplicates = set([x for x in slugs if slugs.count(x) > 1])
if duplicates:
    print("\nDUPLICATE SLUGS FOUND:")
    for d in duplicates:
        print(f" - {d}")
else:
    print("\nNo duplicate slugs found.")
