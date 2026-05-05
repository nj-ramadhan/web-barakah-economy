# profiles/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Profile

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    """Hanya membuat profil saat user baru pertama kali dibuat."""
    if created:
        Profile.objects.get_or_create(user=instance)

# PENTING: Jangan tambahkan signal save_user_profile di sini 
# karena akan menyebabkan RECURSION LOOP dengan Profile.save()