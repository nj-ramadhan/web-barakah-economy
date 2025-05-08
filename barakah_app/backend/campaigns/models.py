# campaigns/models.py
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from ckeditor.fields import RichTextField
from django.utils.text import slugify

def generate_unique_slug(model, name):
    slug = slugify(name)
    unique_slug = slug
    num = 1
    while model.objects.filter(slug=unique_slug).exists():
        unique_slug = f'{slug}-{num}'
        num += 1
    return unique_slug

class Campaign(models.Model):
    CATEGORY_CHOICES = [
        ('infak', 'Infak Barakah'),
        ('sedekah', 'Sedekah Barakah'),
        ('zakat', 'Zakat Barakah'),
        ('donasi', 'Donasi Barakah'),
        ('bencana', 'Bantuan Bencana Alam'),
        ('kemanusiaan', 'Bantuan Kemanusiaan'),
        ('kesehatan', 'Bantuan Kesehatan'),
        ('lingkungan', 'Bantuan Lingkungan'),
        ('pembangunan', 'Bantuan Pembangunan'),
        ('sosial', 'Bantuan Sosial'),
        ('lainnya', 'Lainnya'),       
    ]
    
    title = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = RichTextField() 
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    thumbnail = models.ImageField(upload_to='campaign_images/')
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)  # Make deadline nullable

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
        
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
    description = RichTextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"     