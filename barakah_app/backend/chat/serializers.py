from rest_framework import serializers
from django.utils import timezone
from .models import ConsultantCategory, ConsultantProfile, ChatSession, Message, AISettings, ChatCommand, ConsultationReview, GeneralFeedback
from accounts.models import User


class AISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = '__all__'

class UserBriefSerializer(serializers.ModelSerializer):
    picture = serializers.ImageField(source='profile.picture', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'is_staff', 'picture']

class ConsultantCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultantCategory
        fields = ['id', 'name', 'icon', 'is_active', 'is_ai_enabled', 'welcome_message', 'ai_system_prompt', 'knowledge_base']

class ConsultantProfileSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = ConsultantProfile
        fields = ['id', 'user', 'user_details', 'category', 'category_name', 'is_available', 'bio']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    sender_picture = serializers.ImageField(source='sender.profile.picture', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'session', 'sender', 'sender_name', 'sender_picture', 'content', 'message_type', 'metadata', 'attachment', 'is_read', 'created_at']
        read_only_fields = ['sender', 'created_at']

class ConsultationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationReview
        fields = '__all__'

class GeneralFeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = GeneralFeedback
        fields = ['id', 'user', 'user_name', 'content', 'urgent', 'created_at']
        read_only_fields = ['user', 'created_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    user_details = UserBriefSerializer(source='user', read_only=True)
    consultant_details = UserBriefSerializer(source='consultant', read_only=True)
    seller_details = UserBriefSerializer(source='seller', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    category_welcome_message = serializers.ReadOnlyField(source='category.welcome_message')
    ai_system_prompt = serializers.ReadOnlyField(source='category.ai_system_prompt')
    is_ai_active = serializers.BooleanField(read_only=True)
    last_message = serializers.SerializerMethodField()
    review = ConsultationReviewSerializer(read_only=True)
    product_details = serializers.SerializerMethodField()
    order_details = serializers.SerializerMethodField()
    seller_phone = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = '__all__'

    def get_unread_count(self, obj):
        try:
            if not getattr(obj, 'pk', None):
                return 0
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        except Exception:
            return 0
        return 0

    def get_last_message(self, obj):
        try:
            if not getattr(obj, 'pk', None):
                return None
            last = obj.messages.last()
            if last:
                return MessageSerializer(last).data
        except Exception:
            return None
        return None

    def get_product_details(self, obj):
        try:
            if not obj.product:
                return None
            p = obj.product
            request = self.context.get('request')
            thumb_url = None
            if p.thumbnail:
                try:
                    thumb_url = request.build_absolute_uri(p.thumbnail.url) if request else p.thumbnail.url
                except Exception:
                    thumb_url = p.thumbnail.url if p.thumbnail else None

            now = timezone.now()
            promo = p.promotions.filter(is_active=True, start_date__lte=now, end_date__gte=now).first()
            
            original_price = float(p.price or 0)
            discounted_price = None
            discount_percentage = None
            campaign_name = None
            
            if promo:
                campaign_name = promo.title or 'Promo Kampanye'
                if promo.discount_type == 'percentage':
                    discount_percentage = int(promo.discount_value)
                    discount_amount = original_price * (float(promo.discount_value) / 100.0)
                    discounted_price = max(0, original_price - discount_amount)
                elif promo.discount_type == 'nominal':
                    discounted_price = max(0, original_price - float(promo.discount_value))
                    if original_price > 0:
                        discount_percentage = int(round((float(promo.discount_value) / original_price) * 100.0))
                elif promo.discount_type == 'min_qty_discount' and promo.min_quantity <= 1:
                    if promo.is_min_qty_percentage:
                        discount_percentage = int(promo.discount_value)
                        discount_amount = original_price * (float(promo.discount_value) / 100.0)
                        discounted_price = max(0, original_price - discount_amount)
                    else:
                        discounted_price = max(0, original_price - float(promo.discount_value))
            elif p.discount and float(p.discount) > 0:
                discounted_price = float(p.discount)
                if original_price > 0 and discounted_price < original_price:
                    discount_percentage = int(round(((original_price - discounted_price) / original_price) * 100.0))
                    campaign_name = 'Promo Diskon'

            return {
                'id': p.id,
                'title': p.title,
                'slug': p.slug,
                'price': str(int(discounted_price) if discounted_price is not None else int(original_price)),
                'original_price': str(int(original_price)) if (discounted_price is not None and discounted_price < original_price) else None,
                'discount': str(p.discount or 0),
                'discount_percentage': discount_percentage,
                'campaign_name': campaign_name,
                'stock': p.stock,
                'unit': p.unit,
                'thumbnail': thumb_url,
            }
        except Exception:
            return None

    def get_order_details(self, obj):
        try:
            if not obj.order:
                return None
            ord_obj = obj.order
            items_preview = []
            for item in ord_obj.items.all()[:3]:
                items_preview.append({
                    'title': item.product.title if item.product else 'Produk',
                    'quantity': item.quantity,
                    'price': str(item.price)
                })
            return {
                'id': ord_obj.id,
                'order_number': ord_obj.order_number,
                'status': ord_obj.status,
                'grand_total': str(ord_obj.grand_total),
                'shipping_courier': ord_obj.shipping_courier,
                'resi_number': ord_obj.resi_number,
                'cancel_request_status': ord_obj.cancel_request_status,
                'items': items_preview,
            }
        except Exception:
            return None

    def get_seller_phone(self, obj):
        try:
            target_user = obj.seller or obj.consultant or (obj.product.seller if obj.product else None) or (obj.order.seller if obj.order else None)
            if not target_user:
                return None
            profile = getattr(target_user, 'profile', None)
            phone = target_user.phone or (profile.phone if profile else None)
            return phone
        except Exception:
            return None


class ChatCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatCommand
        fields = '__all__'

