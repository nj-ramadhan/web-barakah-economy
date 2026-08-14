# transactions/serializers.py
from rest_framework import serializers
from .models import UserWallet, WalletTransaction

class WalletTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True, default=None)
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id',
            'transaction_type',
            'amount',
            'balance_before',
            'balance_after',
            'description',
            'order',
            'order_number',
            'created_at'
        ]

class UserWalletSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserWallet
        fields = [
            'id',
            'username',
            'balance',
            'created_at',
            'updated_at'
        ]
