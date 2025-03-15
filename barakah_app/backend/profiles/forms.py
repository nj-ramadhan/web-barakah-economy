from django import forms
from .models import Profile

class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = [
            'picture', 'name_full', 'address', 'birth_place', 'birth_date'
        ]