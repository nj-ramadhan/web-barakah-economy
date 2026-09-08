from rest_framework import serializers
from .models import Donation, DonationWaqafItem
from campaigns.models import Campaign
from campaigns.serializers import CampaignSerializer

class DonationWaqafItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    product_thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = DonationWaqafItem
        fields = [
            'id', 'product_id', 'product_title', 'product_unit', 
            'product_thumbnail', 'quantity', 'price_per_unit', 'subtotal'
        ]

    def get_product_thumbnail(self, obj):
        request = self.context.get('request')
        if obj.product and obj.product.thumbnail:
            return request.build_absolute_uri(obj.product.thumbnail.url) if request else obj.product.thumbnail.url
        return ''

class DonationSerializer(serializers.ModelSerializer):
    campaign = CampaignSerializer(read_only=True)
    campaign_id = serializers.PrimaryKeyRelatedField(
        queryset=Campaign.objects.all(), source='campaign', write_only=True, required=True
    )
    campaign_title = serializers.CharField(source='campaign.title', read_only=True)
    campaign_slug = serializers.CharField(source='campaign.slug', read_only=True)
    proof_file_url = serializers.SerializerMethodField()
    waqaf_items = DonationWaqafItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Donation
        fields = [
            'id', 'campaign', 'campaign_id', 'campaign_title', 'campaign_slug', 'amount', 'admin_fee',
            'donor_name', 'donor_phone', 'donor_email', 'is_anonymous', 
            'message', 'payment_method', 'payment_status', 'source_bank',
            'source_account', 'account_name', 'transfer_date', 'proof_file_url',
            'donation_type', 'waqaf_items', 'is_stock_deducted',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'campaign_title', 'campaign_slug', 'proof_file_url', 'updated_at', 'waqaf_items']
    
    def get_proof_file_url(self, obj):
        request = self.context.get('request')
        try:
            if obj.proof_file:
                return request.build_absolute_uri(obj.proof_file.url)
            elif obj.event_registration and obj.event_registration.payment_proof:
                return request.build_absolute_uri(obj.event_registration.payment_proof.url)
        except:
            return None
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if request:
            # Example: Generate an absolute URL for a field (if needed)
            representation['url'] = request.build_absolute_uri(f'/donations/{instance.id}/')
        return representation