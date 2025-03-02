# donations/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from .models import Donation, Campaign

@receiver(post_save, sender=Donation)
@receiver(post_delete, sender=Donation)
def update_campaign_current_amount(sender, instance, **kwargs):
    """
    Update the current_amount of the Campaign when a Donation is saved or deleted.
    """
    campaign = instance.campaign
    confirmed_amount = Donation.objects.filter(
        campaign=campaign,
        payment_status__in=['verified']
    ).aggregate(total=Sum('amount'))['total'] or 0

    campaign.current_amount = confirmed_amount
    campaign.save(update_fields=['current_amount'])