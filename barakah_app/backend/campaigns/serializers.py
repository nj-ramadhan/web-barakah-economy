# campaigns/serializers.py
from rest_framework import serializers
from .models import Campaign, Update, CampaignRealization
from donations.models import Donation

from products.models import Product

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
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)
    collab_products = serializers.PrimaryKeyRelatedField(many=True, queryset=Product.objects.all(), required=False)
    collab_products_details = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'title', 'slug', 'description', 'category', 'thumbnail',
            'target_amount', 'current_amount', 'is_featured', 'is_active',
            'created_at', 'deadline', 'donations', 'updates',
            'has_unlimited_deadline', 'total_realization', 'view_count',
            'created_by', 'created_by_username', 'approval_status', 'rejection_reason',
            'likes_count', 'is_liked',
            'is_collaboration', 'collaboration_type', 'collab_products', 'collab_products_details'
        ]
        read_only_fields = ['created_by', 'approval_status', 'rejection_reason']

    def get_has_unlimited_deadline(self, obj):
        return obj.deadline is None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_collab_products_details(self, obj):
        from django.utils import timezone
        products = obj.collab_products.filter(is_active=True)
        request = self.context.get('request')
        now = timezone.now()
        result = []
        for p in products:
            thumb_url = ''
            if p.thumbnail:
                thumb_url = request.build_absolute_uri(p.thumbnail.url) if request else p.thumbnail.url
            seller_name = getattr(getattr(p.seller, 'profile', None), 'name_full', None) or (p.seller.username if p.seller else 'BAE Store')

            # Check for active store campaign / promotion
            original_price = float(p.price)
            effective_price = original_price
            has_campaign = False
            campaign_title = ''

            promo = p.promotions.filter(is_active=True, start_date__lte=now, end_date__gte=now).first()
            if promo:
                disc_val = float(promo.discount_value or 0)
                if promo.discount_type == 'percentage':
                    effective_price = max(0.0, original_price - (original_price * (disc_val / 100.0)))
                    has_campaign = True
                elif promo.discount_type == 'nominal':
                    effective_price = max(0.0, original_price - disc_val)
                    has_campaign = True
                elif promo.discount_type == 'min_qty_discount' and (promo.min_quantity or 1) <= 1:
                    if promo.is_min_qty_percentage:
                        effective_price = max(0.0, original_price - (original_price * (disc_val / 100.0)))
                    else:
                        effective_price = max(0.0, original_price - disc_val)
                    has_campaign = True
                if has_campaign:
                    campaign_title = promo.title
            elif getattr(p, 'discount', None) and float(p.discount) > 0:
                effective_price = max(0.0, original_price - float(p.discount))
                has_campaign = True
                campaign_title = 'Diskon'

            result.append({
                'id': p.id,
                'title': p.title,
                'slug': p.slug,
                'price': effective_price,
                'original_price': original_price,
                'has_campaign': has_campaign,
                'campaign_title': campaign_title,
                'stock': p.stock,
                'unit': p.unit,
                'thumbnail': thumb_url,
                'seller_name': seller_name,
            })
        return result