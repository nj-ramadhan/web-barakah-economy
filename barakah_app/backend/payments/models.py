from django.db import models

class PaymentSetting(models.Model):
    PAYMENT_MODE_CHOICES = [
        ('manual', 'Kirim Bukti Transfer'),
        ('dynaqris', 'DynaQRIS Otomatis'),
    ]
    
    active_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default='manual')
    
    # DynaQRIS Settings
    dynaqris_api_key = models.CharField(max_length=255, default='dq_live_623412215126097e2fe48e086a4e2d15')
    dynaqris_qris_id = models.CharField(max_length=255, default='c7937a09-5a9a-49bd-a93b-e013af429995')
    payment_timeout_minutes = models.IntegerField(default=5, help_text="Batas waktu pembayaran QRIS (menit)")
    enable_anti_spam = models.BooleanField(default=True, help_text="Cegah pembuatan QRIS berulang dalam waktu singkat")
    
    # Manual Bank Transfer Info
    bank_name = models.CharField(max_length=100, default='Bank Syariah Indonesia (BSI)')
    account_number = models.CharField(max_length=100, default='7260599187')
    account_name = models.CharField(max_length=100, default='Barakah Economy Community')
    manual_qris_image = models.ImageField(upload_to='payment_settings/', null=True, blank=True)

    # Android Notification Listener Webhook Settings
    android_webhook_enabled = models.BooleanField(default=True, help_text="Aktifkan listener notifikasi bank via HP Android")
    android_webhook_secret = models.CharField(max_length=255, default='barakah_android_notif_secret_123', help_text="Secret Token untuk verifikasi request webhook HP Android")
    listener_device_id = models.CharField(max_length=255, null=True, blank=True, help_text="ID Perangkat HP Android yang sedang aktif (Lock 1 HP)")
    listener_device_name = models.CharField(max_length=255, null=True, blank=True, help_text="Nama / Model Perangkat HP Android aktif")
    listener_last_heartbeat = models.DateTimeField(null=True, blank=True, help_text="Timestamp terakhir heartbeat listener diterima")

    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_settings(cls):
        settings_obj, _ = cls.objects.get_or_create(id=1)
        return settings_obj

    def __str__(self):
        return f"Payment Settings (Active Mode: {self.get_active_mode_display()})"
