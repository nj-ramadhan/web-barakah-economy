import os
import sys
import django

# Set up Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
os.environ['DEBUG'] = 'True'
django.setup()

from courses.models import Course

print(f"{'ID':<5} | {'Slug':<50} | {'Title'}")
print("-" * 80)
for course in Course.objects.all():
    print(f"{course.id:<5} | {str(course.slug):<50} | {course.title}")
