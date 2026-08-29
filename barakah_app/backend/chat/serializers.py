from rest_framework import serializers
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
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return MessageSerializer(last).data
        return None


    def get_product_details(self, obj):
        if not obj.product:
            return None
        p = obj.product
        request = self.context.get('request')
        thumb_url = request.build_absolute_uri(p.thumbnail.url) if (request and p.thumbnail) else (p.thumbnail.url if p.thumbnail else None)
        return {
            'id': p.id,
            'title': p.title,
            'slug': p.slug,
            'price': str(p.price),
            'discount': str(p.discount),
            'stock': p.stock,
            'unit': p.unit,
            'thumbnail': thumb_url,
        }

    def get_order_details(self, obj):
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

    def get_seller_phone(self, obj):
        target_user = obj.seller or obj.consultant
        if not target_user:
            return None
        profile = getattr(target_user, 'profile', None)
        phone = target_user.phone or (profile.phone if profile else None)
        return phone

class ChatCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatCommand
        fields = '__all__'

