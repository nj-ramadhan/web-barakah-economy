# transactions/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import UserWallet, WalletTransaction
from .serializers import UserWalletSerializer, WalletTransactionSerializer

class UserWalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = UserWallet.get_or_create_wallet(request.user)
        serializer = UserWalletSerializer(wallet)
        return Response(serializer.data)

class WalletTransactionHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = UserWallet.get_or_create_wallet(request.user)
        transactions = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response({
            'balance': wallet.balance,
            'transactions': serializer.data
        })
