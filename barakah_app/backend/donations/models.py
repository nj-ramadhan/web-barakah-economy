# donations/models.py
from django.db import models
from django.db.models import Sum
from accounts.models import User
from campaigns.models import Campaign
import uuid
import os

def proof_file_path(instance, filename):
    """Generate a unique path for uploaded proof files"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('donation_proofs', filename)

class Donation(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('bsi', 'Bank Syariah Indonesia'),
        ('bjb', 'Bank Jabar Banten Syariah'),
        ('midtrans', 'Midtrans'),
        ('cash', 'Cash'),
        ('lainnya', 'Lainnya'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='donations')
    donor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='donations')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    donor_name = models.CharField(max_length=100)
    donor_phone = models.CharField(max_length=15)
    donor_email = models.EmailField(blank=True, null=True)
    is_anonymous = models.BooleanField(default=False)
    message = models.TextField(blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Payment confirmation fields
    source_bank = models.CharField(max_length=100, blank=True, null=True)
    source_account = models.CharField(max_length=100, blank=True, null=True)
    account_name = models.CharField(max_length=100, blank=True, null=True)
    transfer_date = models.DateField(blank=True, null=True)
    proof_file = models.FileField(upload_to=proof_file_path, blank=True, null=True)
    
    # WhatsApp confirmation tracking
    whatsapp_sent = models.BooleanField(default=False)
    whatsapp_sent_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """
        Override the save method to update the Campaign's current_amount.
        """
        super().save(*args, **kwargs)  # Save the Donation first

        # Calculate the total confirmed/verified donations for the Campaign
        confirmed_amount = Donation.objects.filter(
            campaign=self.campaign,
            payment_status__in=['verified']
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Update the Campaign's current_amount
        self.campaign.current_amount = confirmed_amount
        self.campaign.save(update_fields=['current_amount'])
            
    def __str__(self):
        return f"{self.donor_name} - {self.amount} - {self.campaign.title}"
    
    class Meta:
        ordering = ['-created_at']    