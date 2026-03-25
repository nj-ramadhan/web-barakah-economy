import os
import django
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
try:
    django.setup()
    print("Django setup successful.")
except Exception as e:
    print(f"Django setup FAILED: {e}")
    sys.exit(1)

from courses.models import Course, CourseEnrollment, CourseMaterial
from django.db import connection

print(f"Using database: {connection.settings_dict.get('NAME')}")

try:
    print("\nAttempting to fetch courses...")
    courses = Course.objects.all()
    count = courses.count()
    print(f"Found {count} courses.")
    
    for c in courses[:5]:
        print(f"- {c.title} (Slug: {c.slug}, Active: {c.is_active}, Instructor: {c.instructor.username})")
        
except Exception as e:
    print(f"Error fetching courses: {e}")
    import traceback
    traceback.print_exc()

try:
    print("\nAttempting to fetch enrollments...")
    enrollments = CourseEnrollment.objects.all()
    print(f"Found {enrollments.count()} enrollments.")
except Exception as e:
    print(f"Error fetching enrollments: {e}")
    import traceback
    traceback.print_exc()
