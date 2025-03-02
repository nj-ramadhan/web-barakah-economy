# campaigns/urls.py
from django.urls import path
from .views import CampaignDetailView

urlpatterns = [
    path('<slug:slug>/', CampaignDetailView.as_view(), name='campaign-detail'),
]