import os
import sys
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "barakah_api.settings")
django.setup()

from digital_products.models import DigitalProduct
from courses.models import Course
from profiles.models import Profile

from django.core.files.storage import default_storage

def test_popular_sellers():
    try:
        digital_seller_ids = DigitalProduct.objects.filter(is_active=True).values_list('user_id', flat=True)
        course_instructor_ids = Course.objects.filter(is_active=True).values_list('instructor_id', flat=True)
        all_seller_ids = set(list(digital_seller_ids) + list(course_instructor_ids))
        
        profiles = Profile.objects.filter(user_id__in=all_seller_ids).select_related('user')[:12]
        
        data = []
        for p in profiles:
            shop_thumbnail = None
            if p.shop_thumbnail:
                 try:
                    shop_thumbnail = p.shop_thumbnail.url
                 except Exception as err:
                    print(f"Error accessing thumbnail for {p.user.username}: {err}")
            
            data.append({
                'username': p.user.username,
                'name': p.name_full or p.user.username,
                'shop_thumbnail': shop_thumbnail,
                'shop_description': p.shop_description or ""
            })
        print(f"Success: Found {len(data)} profiles. {json.dumps(data, indent=2)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Failed with exception: {e}")

if __name__ == '__main__':
    test_popular_sellers()
