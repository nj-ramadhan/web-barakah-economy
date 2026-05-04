from courses.models import Course
from accounts.models import Role
from django.utils.text import slugify
from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Grant activities permission to Admin role
# Try both capitalized and lowercase as it might vary
admin_roles = Role.objects.filter(name__iexact='Admin') | Role.objects.filter(code__iexact='admin')

for role in admin_roles:
    menus = role.accessible_menus or []
    if 'activities' not in menus:
        menus.append('activities')
        role.accessible_menus = menus
        role.save()
        print(f'Permission activities granted to role: {role.name}')
    else:
        print(f'Permission activities already exists for role: {role.name}')

if not admin_roles.exists():
    print('Admin role not found')

# 2. Fix empty slugs for courses
courses_no_slug = Course.objects.filter(slug='')
print(f'Found {courses_no_slug.count()} courses with empty slug')

for c in courses_no_slug:
    base_slug = slugify(c.title)
    # Ensure uniqueness
    slug = base_slug
    counter = 1
    while Course.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    c.slug = slug
    c.save()
    print(f'Fixed ID: {c.id} - New Slug: {c.slug}')

print('Database fix completed!')
