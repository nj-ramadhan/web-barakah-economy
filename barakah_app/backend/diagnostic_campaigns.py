import os
import django
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from campaigns.models import Campaign

slugs = ['ramadhan-barakah', 'ramadhan-mufidize']
for slug in slugs:
    try:
        campaign = Campaign.objects.get(slug=slug)
        print(f"Found campaign: {campaign.title} (slug: {campaign.slug}, id: {campaign.id}, active: {campaign.is_active})")
    except Campaign.DoesNotExist:
        print(f"Campaign with slug '{slug}' NOT found.")

# List all campaigns just in case
print("\nAll campaigns:")
for c in Campaign.objects.all():
    print(f"- {c.title} (slug: {c.slug}, id: {c.id}, active: {c.is_active})")
