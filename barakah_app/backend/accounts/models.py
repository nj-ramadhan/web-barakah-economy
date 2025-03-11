from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(unique=True)
    is_anonymous_donor = models.BooleanField(default=False)

    def __str__(self):
        return self.username    
