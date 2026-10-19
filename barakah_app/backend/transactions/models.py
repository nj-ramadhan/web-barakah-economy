from django.db import models, transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from accounts.models import User
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)


class UserWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dompet User / Saldo BAE"
        verbose_name_plural = "Dompet User / Saldo BAE"

    def __str__(self):
        return f"Wallet {self.user.username} (Saldo: Rp {self.balance:,.0f})"

    @classmethod
    def get_or_create_wallet(cls, user):
        wallet, _ = cls.objects.get_or_create(user=user)
        return wallet

    def credit(self, amount, transaction_type='REFUND', description='', reference_order=None, reference_withdrawal=None):
        """
        Safely credit money into user wallet using atomic row lock.
        """
        amount = Decimal(str(amount))
        if amount <= 0:
            return self

        with transaction.atomic():
            wallet = UserWallet.objects.select_for_update().get(pk=self.pk)
            balance_before = wallet.balance
            wallet.balance += amount
            wallet.save(update_fields=['balance', 'updated_at'])

            WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                description=description,
                order=reference_order,
                withdrawal=reference_withdrawal
            )
            self.balance = wallet.balance
            return self

    def debit(self, amount, transaction_type='PAYMENT', description='', reference_order=None, reference_withdrawal=None):
        """
        Safely debit money from user wallet using atomic row lock.
        Raises ValidationError if insufficient balance.
        """
        amount = Decimal(str(amount))
        if amount <= 0:
            return self

        with transaction.atomic():
            wallet = UserWallet.objects.select_for_update().get(pk=self.pk)
            if wallet.balance < amount:
                raise ValidationError(f"Saldo BAE tidak mencukupi. Saldo Anda: Rp {wallet.balance:,.0f}, Dibutuhkan: Rp {amount:,.0f}")

            balance_before = wallet.balance
            wallet.balance -= amount
            wallet.save(update_fields=['balance', 'updated_at'])

            WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type=transaction_type,
                amount=-amount,
                balance_before=balance_before,
                balance_after=wallet.balance,
                description=description,
                order=reference_order,
                withdrawal=reference_withdrawal
            )
            self.balance = wallet.balance
            return self


class WalletTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('REFUND', 'Pengembalian Dana (Refund Pesanan Batal)'),
        ('PAYMENT', 'Pembayaran Belanja E-Commerce / Sinergy'),
        ('EARNING', 'Hasil Penjualan Produk / Kelas'),
        ('WITHDRAWAL', 'Penarikan Saldo BAE'),
        ('ADJUSTMENT', 'Penyesuaian Saldo Admin'),
    ]

    wallet = models.ForeignKey(UserWallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2) # Positif (+) jika masuk, Negatif (-) jika keluar
    balance_before = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.TextField(blank=True, default='')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
    withdrawal = models.ForeignKey('digital_products.WithdrawalRequest', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Mutasi Saldo BAE"
        verbose_name_plural = "Mutasi Saldo BAE"

    def __str__(self):
        sign = "+" if self.amount >= 0 else ""
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.wallet.user.username} {self.transaction_type}: {sign}Rp {self.amount:,.0f}"


class OutgoingFund(models.Model):
    ACCOUNT_CHOICES = [
        ('commercial', 'Rekening Komersial (Store, Event, Digital, E-Course)'),
        ('charity', 'Rekening Charity / Sosial (Donasi & ZIS)'),
    ]
    CATEGORY_CHOICES = [
        ('operational', 'Operasional & Utilitas'),
        ('charity_distribution', 'Penyaluran Donasi / Mustahik'),
        ('withdrawal', 'Penarikan Dana User / Seller'),
        ('vendor_supplier', 'Vendor / Supplier / Pengadaan'),
        ('event_cost', 'Biaya Operasional Event'),
        ('tax_admin', 'Pajak & Biaya Admin'),
        ('other', 'Pengeluaran Lainnya'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending (Menunggu Proses)'),
        ('completed', 'Selesai (Sudah Dicairkan / Ditransfer)'),
        ('cancelled', 'Dibatalkan'),
    ]

    fund_account = models.CharField(max_length=20, choices=ACCOUNT_CHOICES, default='commercial')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='operational')
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.TextField(blank=True, default='')
    recipient_name = models.CharField(max_length=150, blank=True, default='')
    recipient_account = models.CharField(max_length=150, blank=True, default='') # Misal: Bank BSI 123456 a.n Fulana
    proof_file = models.ImageField(upload_to='expense_proofs/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')

    # Link to user withdrawal request if applicable
    withdrawal_request = models.ForeignKey(
        'digital_products.WithdrawalRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outgoing_fund_entries'
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_expenses')
    transaction_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-transaction_date', '-created_at']
        verbose_name = "Pengeluaran / Uang Keluar"
        verbose_name_plural = "Pengeluaran / Uang Keluar"

    def __str__(self):
        return f"[{self.fund_account.upper()}] {self.title} - Rp {self.amount:,.0f} ({self.status})"

