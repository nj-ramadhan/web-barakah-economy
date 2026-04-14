from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from .models import Event
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Event)
def create_activity_documentation(sender, instance, created, **kwargs):
    """
    Automatically create an Activity documentation when an Event is marked as 'completed'.
    """
    if instance.status == 'completed':
        from site_content.models import Activity
        
        # Check if Activity already exists for this event
        if not hasattr(instance, 'activity_documentation'):
            try:
                # Prepare content with detail link
                # We use a relative path /event/{slug} which the frontend router should handle
                detail_link = f'<br/><br/><p><a href="/event/{instance.slug}" class="text-green-700 underline font-semibold">Lihat Detail & Dokumentasi Lengkap Event</a></p>'
                activity_content = (instance.description or "") + detail_link
                
                # Determine date (end_date preferred, then start_date)
                activity_date = instance.end_date.date() if instance.end_date else instance.start_date.date()
                
                # Create the Activity
                activity = Activity.objects.create(
                    title=instance.title,
                    content=activity_content,
                    date=activity_date,
                    event=instance
                )
                
                # Copy header image if it exists
                if instance.header_image:
                    try:
                        # We need to open and read the file to copy it
                        image_name = instance.header_image.name.split('/')[-1]
                        activity.header_image.save(
                            image_name,
                            ContentFile(instance.header_image.read()),
                            save=True
                        )
                    except Exception as img_err:
                        logger.error(f"Failed to copy header image for activity from event {instance.id}: {img_err}")
                
                logger.info(f"Automatically created Activity documentation for Event: {instance.title}")
            
            except Exception as e:
                logger.error(f"Error creating automatic activity for event {instance.id}: {e}")
