# campaigns/serializers.py
from rest_framework import serializers
from .models import Campaign, Update
from donations.models import Donation

class DonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = ['id', 'donor_name', 'amount', 'created_at']

class UpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Update
        fields = ['id', 'title', 'description', 'created_at']   

class CampaignSerializer(serializers.ModelSerializer):
    donations = DonationSerializer(many=True, read_only=True)
    updates = UpdateSerializer(many=True, read_only=True)
    has_unlimited_deadline = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = '__all__'

    def get_has_unlimited_deadline(self, obj):
        return obj.deadline is None