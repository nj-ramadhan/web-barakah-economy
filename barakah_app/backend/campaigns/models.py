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
        ('duafa', 'Bantuan Duafa'),
        ('lainnya', 'Lainnya'),       
    ]

    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Menunggu Verifikasi'),
        ('approved', 'Disetujui'),
        ('rejected', 'Ditolak'),
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
    deadline = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)

    # User submission fields
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='submitted_campaigns'
    )
    approval_status = models.CharField(
        max_length=20, choices=APPROVAL_STATUS_CHOICES, default='approved'
    )
    rejection_reason = models.TextField(blank=True)

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
            return False
        return timezone.now() > self.deadline

    def has_unlimited_deadline(self):
        """Check if the campaign has an unlimited deadline"""
        return self.deadline is None

    def __str__(self):
        return f"{self.title}"   

    @property
    def total_realization(self):
        """Calculate total realized amount for this campaign"""
        return self.realizations.aggregate(total=Sum('nominal'))['total'] or 0

class CampaignRealization(models.Model):
    ASNAF_CHOICES = [
        ('Fakir', 'Fakir'),
        ('Miskin', 'Miskin'),
        ('Amil', 'Amil'),
        ('Mualaf', 'Mualaf'),
        ('Riqab', 'Riqab'),
        ('Gharimin', 'Gharimin'),
        ('Fisabilillah', 'Fisabilillah'),
        ('Ibnu Sabil', 'Ibnu Sabil'),
        ('Yatim', 'Yatim'),
        ('Operational', 'Operational'),
        ('Bencana Alam', 'Bencana Alam'),
        ('Kemanusiaan', 'Kemanusiaan'),
        ('Kesehatan', 'Kesehatan'),
        ('Pendidikan', 'Pendidikan'),
        ('Lingkungan', 'Lingkungan'),
        ('Pembangunan', 'Pembangunan'),
        ('Sosial', 'Sosial'),
        ('Masjid', 'Masjid'),
        ('Waqaf', 'Waqaf'),
        ('Lainnya', 'Lainnya'),
    ]
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='realizations')
    date = models.DateField()
    description = models.TextField()
    beneficiaries = models.TextField(help_text="List penerima manfaat")
    beneficiary_status = models.CharField(max_length=50, choices=ASNAF_CHOICES, default='Lainnya')
    nominal = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Realization for {self.campaign.title} on {self.date}"

    def clean(self):
        from django.core.exceptions import ValidationError
        
        existing_realizations = self.campaign.realizations.all()
        if self.pk:
            existing_realizations = existing_realizations.exclude(pk=self.pk)
            
        total_existing = existing_realizations.aggregate(total=Sum('nominal'))['total'] or 0
        
        if (total_existing + self.nominal) > self.campaign.current_amount:
            raise ValidationError({
                'nominal': f"Total realisasi ({total_existing + self.nominal}) melebihi dana yang terkumpul ({self.campaign.current_amount})."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Update(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='updates')
    title = models.CharField(max_length=100)
    description = RichTextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"     