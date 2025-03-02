# campaigns/models.py
from django.db import models
from django.db.models import Sum
from django.utils import timezone

class Campaign(models.Model):
    CATEGORY_CHOICES = [
        ('dhuafa', 'Peduli Dhuafa'),
        ('yatim', 'Peduli Anak Yatim'),
        ('quran', 'Wakaf Mushaf Al Quran'),
        ('qurban', 'Qurban Peduli'),
        ('palestine', 'Bantuan Palestina'),
        ('education', 'Bantuan Pendidikan'),
        ('iftar', 'Berbagi Iftar'),
        ('jumat', 'Jumat Berkah'),
    ]
    
    title = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='campaign_images/')
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)  # Make deadline nullable

    def update_collected_amount(self):
        """Update the collected amount based on confirmed donations"""
        confirmed_amount = self.donations.filter(
            payment_status__in=['confirmed', 'verified']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        self.current_amount = confirmed_amount
        self.save(update_fields=['current_amount'])
        
    def get_progress_percentage(self):
        """Calculate campaign funding progress percentage"""
        if self.target_amount == 0:
            return 0
        return min(100, (self.current_amount / self.target_amount) * 100)    

    def is_expired(self):
        """Check if the campaign has passed its deadline"""
        if self.deadline is None:
            return False  # Campaigns with no deadline never expire
        return timezone.now() > self.deadline

    def has_unlimited_deadline(self):
        """Check if the campaign has an unlimited deadline"""
        return self.deadline is None

    def __str__(self):
        return f"{self.title}"   

class Update(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='updates')
    title = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"     