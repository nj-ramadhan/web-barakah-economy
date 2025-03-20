# donations/urls.py
from django.urls import path
from .views import DonationView, CampaignDonationsView, CreateDonationView, UpdateDonationView 

urlpatterns = [
    path('donation/', DonationView.as_view(), name='donation'),
    path('campaign/<slug:slug>/donations/', CampaignDonationsView.as_view(), name='campaign-donations'),
    path('<str:campaign_slug>/create-donation/', CreateDonationView.as_view(), name='create-donation'),
    path('<int:donation_id>/update-donation/', UpdateDonationView.as_view(), name='update-donation'),
]