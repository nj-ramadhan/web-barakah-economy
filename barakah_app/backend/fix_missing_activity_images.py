import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'barakah_app.settings')
django.setup()

from site_content.models import Activity
from django.core.files.base import ContentFile

print("=" * 60)
print("Barakah Economy - Fix Missing Activity Images Utility")
print("=" * 60)

activities = Activity.objects.filter(event__isnull=False)
print(f"Found {activities.count()} activities linked to events in the database.\n")

fixed_count = 0
for activity in activities:
    # Robust check for empty/blank header image field
    has_image = bool(activity.header_image and activity.header_image.name and activity.header_image.name.strip())
    print(f"Activity ID: {activity.id} | Title: '{activity.title}'")
    print(f"  Current image path: '{activity.header_image.name if activity.header_image else ''}' (has_image={has_image})")
    
    if not has_image:
        event = activity.event
        # Try header image first, fallback to thumbnail
        event_image = event.header_image if (event.header_image and event.header_image.name) else event.thumbnail
        
        if event_image and event_image.name:
            print(f"  -> Found event image: '{event_image.name}' on Event ID {event.id} ('{event.title}')")
            try:
                # Open and read image content
                try:
                    event_image.open()
                except Exception as open_err:
                    print(f"     [Warning] Could not open file via Django storage: {open_err}")
                
                event_image.seek(0)
                file_content = event_image.read()
                
                if not file_content:
                    raise ValueError("File content is empty")

                # Get clean filename
                image_name = event_image.name.split('/')[-1]
                
                # Save file to activity's header_image
                activity.header_image.save(
                    image_name,
                    ContentFile(file_content),
                    save=True
                )
                print(f"  ✅ [SUCCESS] Saved and copied image '{image_name}' to activity!")
                fixed_count += 1
            except Exception as e:
                print(f"  ❌ [ERROR] Failed to copy image: {e}")
        else:
            print("  ⚠️ [SKIP] No header_image or thumbnail found on the linked event.")
    else:
        print("  ℹ️ [SKIP] Already has a header image.")
    print("-" * 60)

print(f"\nCompleted. Successfully fixed {fixed_count} activities.")
print("=" * 60)
