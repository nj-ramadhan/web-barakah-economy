from django.db import models
from accounts.models import User
import uuid
import os

def zis_proof_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('zis_proofs', filename)

class ZISConfig(models.Model):
    """Configuration for ZIS categories and bank info set by Admin."""
    name = models.CharField(max_length=100, default="Konfigurasi ZIS Utama")
    categories = models.JSONField(default=list, help_text="List of category names (max 8)")
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    account_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({'Aktif' if self.is_active else 'Non-aktif'})"

class ZISSubmission(models.Model):
    """Submission from staff/member for ZIS recap."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='zis_submissions')
    config = models.ForeignKey(ZISConfig, on_delete=models.PROTECT, related_name='submissions')
    values = models.JSONField(default=dict, help_text="Mapping of category name to nominal amount")
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    transfer_proof = models.ImageField(upload_to=zis_proof_path)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ZIS {self.user.username} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-created_at']
