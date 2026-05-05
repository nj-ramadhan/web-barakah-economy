from django.db import models
from accounts.models import User

class Activity(models.Model):
    ACTIVITY_TYPE_CHOICES = [
        ('running', 'Lari'),
        ('cycling', 'Sepeda'),
        ('walking', 'Jalan Kaki'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities_tracking')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES, default='running')
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    
    distance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Distance in kilometers")
    duration = models.PositiveIntegerField(default=0, help_text="Duration in seconds")
    
    pace = models.CharField(max_length=20, blank=True, null=True, help_text="Average pace (min/km)")
    calories = models.PositiveIntegerField(default=0)
    
    # route_data will store an array of objects: [{"lat": -6.1, "lng": 106.8, "timestamp": "..."}, ...]
    route_data = models.JSONField(default=list, blank=True)
    
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Activities"
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.activity_type.capitalize()} by {self.user.username} on {self.start_time.strftime('%Y-%m-%d')}"

class WorkoutLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workout_logs')
    title = models.CharField(max_length=100) # e.g., Push Up
    target = models.CharField(max_length=50) # e.g., 20 Reps
    actual = models.CharField(max_length=50) # e.g., 15 Reps
    calories_burned = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.user.username} ({self.actual}/{self.target})"
