# campaigns/serializers.py
from rest_framework import serializers
from .models import Campaign, Update, CampaignRealization
from donations.models import Donation

class DonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = ['id', 'donor_name', 'amount', 'created_at']

class UpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Update
        fields = ['id', 'title', 'description', 'created_at']   

class CampaignRealizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRealization
        fields = ['id', 'campaign', 'date', 'description', 'beneficiaries', 'beneficiary_status', 'nominal', 'created_at']

class CampaignSerializer(serializers.ModelSerializer):
    donations = DonationSerializer(many=True, read_only=True)
    updates = UpdateSerializer(many=True, read_only=True)
    has_unlimited_deadline = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)

    class Meta:
        model = Campaign
        fields = [
            'id', 'title', 'slug', 'description', 'category', 'thumbnail',
            'target_amount', 'current_amount', 'is_featured', 'is_active',
            'created_at', 'deadline', 'donations', 'updates',
            'has_unlimited_deadline', 'total_realization',
            'created_by', 'created_by_username', 'approval_status', 'rejection_reason'
        ]
        read_only_fields = ['created_by', 'approval_status', 'rejection_reason']

    def get_has_unlimited_deadline(self, obj):
        return obj.deadline is None