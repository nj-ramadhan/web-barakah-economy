# donations/serializers.py
from rest_framework import serializers
from .models import Donation

class DonationSerializer(serializers.ModelSerializer):
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)
    campaign_slug = serializers.CharField(source='campaign.slug', read_only=True)
    proof_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Donation
        fields = [
            'id', 'campaign', 'campaign_title', 'campaign_slug', 'amount', 
            'donor_name', 'donor_phone', 'donor_email', 'is_anonymous', 
            'message', 'payment_method', 'payment_status', 'source_bank',
            'source_account', 'account_name', 'transfer_date', 'proof_file_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'campaign_title', 'campaign_slug', 'proof_file_url', 'created_at', 'updated_at']
    
    def get_proof_file_url(self, obj):
        if obj.proof_file:
            return self.context.get('request').build_absolute_uri(obj.proof_file.url)
        return None
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if request:
            # Example: Generate an absolute URL for a field (if needed)
            representation['url'] = request.build_absolute_uri(f'/donations/{instance.id}/')
        return representation