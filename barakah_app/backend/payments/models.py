from django.db import models
from django.utils import timezone

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
    listener_device_id = models.CharField(max_length=255, null=True, blank=True, help_text="ID Perangkat HP Android terakhir")
    listener_device_name = models.CharField(max_length=255, null=True, blank=True, help_text="Nama / Model Perangkat HP Android terakhir")
    listener_last_heartbeat = models.DateTimeField(null=True, blank=True, help_text="Timestamp terakhir heartbeat listener diterima")

    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_settings(cls):
        settings_obj, _ = cls.objects.get_or_create(id=1)
        return settings_obj

    def __str__(self):
        return f"Payment Settings (Active Mode: {self.get_active_mode_display()})"


class ModulePaymentSetting(models.Model):
    """
    Dedicated Payment Channel / Plotting Configuration per Module:
    1. charity (Donasi & ZISWAF)
    2. event (Event & Tiket)
    3. digital (Produk Digital)
    4. ecourse (E-Course & Kelas Online)
    5. store (Produk Toko / Store E-Commerce)
    6. landing_page (Landing Page Builder)
    7. service (Jasa & Layanan)
    """
    MODULE_CHOICES = [
        ('charity', 'Charity & ZISWAF (Donasi)'),
        ('event', 'Event & Tiket'),
        ('digital', 'Produk Digital'),
        ('ecourse', 'E-Course & Kelas Online'),
        ('store', 'Produk Toko / Store (E-Commerce)'),
        ('landing_page', 'Landing Page Builder'),
        ('service', 'Jasa & Layanan'),
    ]
    PAYMENT_MODE_CHOICES = [
        ('default', 'Gunakan Pengaturan Global'),
        ('dynaqris', 'DynaQRIS Otomatis Saja'),
        ('manual', 'QRIS Statis & Transfer Manual Saja'),
        ('both', 'Keduanya (User Memilih)'),
    ]

    module_code = models.CharField(max_length=30, choices=MODULE_CHOICES, unique=True)
    module_title = models.CharField(max_length=100)
    is_custom = models.BooleanField(default=False, help_text="Aktifkan plot pengaturan khusus untuk modul ini")
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default='default')

    # Custom DynaQRIS Credentials
    dynaqris_api_key = models.CharField(max_length=255, blank=True, default='')
    dynaqris_qris_id = models.CharField(max_length=255, blank=True, default='')

    # Custom Manual / Statis QRIS & Bank Info
    bank_name = models.CharField(max_length=100, blank=True, default='')
    account_number = models.CharField(max_length=100, blank=True, default='')
    account_name = models.CharField(max_length=100, blank=True, default='')
    manual_qris_image = models.ImageField(upload_to='payment_settings/modules/', null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Plotting QRIS & Pembayaran Modul"
        verbose_name_plural = "Plotting QRIS & Pembayaran Modul"

    def __str__(self):
        return f"Plotting {self.module_title} ({self.get_payment_mode_display()})"

    @classmethod
    def get_or_create_all_defaults(cls):
        default_modules = [
            ('charity', 'Charity & ZISWAF (Donasi)'),
            ('event', 'Event & Tiket'),
            ('digital', 'Produk Digital'),
            ('ecourse', 'E-Course & Kelas Online'),
            ('store', 'Produk Toko / Store (E-Commerce)'),
            ('landing_page', 'Landing Page Builder'),
            ('service', 'Jasa & Layanan'),
        ]
        created_or_found = []
        for code, title in default_modules:
            obj, _ = cls.objects.get_or_create(
                module_code=code,
                defaults={'module_title': title, 'payment_mode': 'default', 'is_custom': False}
            )
            created_or_found.append(obj)
        return created_or_found

    @classmethod
    def get_effective_config(cls, module_code):
        global_cfg = PaymentSetting.get_settings()
        mod_cfg = cls.objects.filter(module_code=module_code).first()

        if not mod_cfg or not mod_cfg.is_custom:
            return {
                'module_code': module_code,
                'module_title': mod_cfg.module_title if mod_cfg else module_code,
                'is_custom': False,
                'payment_mode': 'default',
                'active_mode': global_cfg.active_mode,
                'dynaqris_api_key': global_cfg.dynaqris_api_key,
                'dynaqris_qris_id': global_cfg.dynaqris_qris_id,
                'bank_name': global_cfg.bank_name,
                'account_number': global_cfg.account_number,
                'account_name': global_cfg.account_name,
                'manual_qris_image_url': global_cfg.manual_qris_image.url if (global_cfg.manual_qris_image and hasattr(global_cfg.manual_qris_image, 'url')) else None,
                'notes': '',
                'payment_timeout_minutes': global_cfg.payment_timeout_minutes,
            }

        api_key = mod_cfg.dynaqris_api_key.strip() or global_cfg.dynaqris_api_key
        qris_id = mod_cfg.dynaqris_qris_id.strip() or global_cfg.dynaqris_qris_id
        b_name = mod_cfg.bank_name.strip() or global_cfg.bank_name
        acc_no = mod_cfg.account_number.strip() or global_cfg.account_number
        acc_nm = mod_cfg.account_name.strip() or global_cfg.account_name
        qris_img = mod_cfg.manual_qris_image.url if (mod_cfg.manual_qris_image and hasattr(mod_cfg.manual_qris_image, 'url')) else (
            global_cfg.manual_qris_image.url if (global_cfg.manual_qris_image and hasattr(global_cfg.manual_qris_image, 'url')) else None
        )
        active_mode = mod_cfg.payment_mode if mod_cfg.payment_mode != 'default' else global_cfg.active_mode

        return {
            'module_code': module_code,
            'module_title': mod_cfg.module_title,
            'is_custom': True,
            'payment_mode': mod_cfg.payment_mode,
            'active_mode': active_mode,
            'dynaqris_api_key': api_key,
            'dynaqris_qris_id': qris_id,
            'bank_name': b_name,
            'account_number': acc_no,
            'account_name': acc_nm,
            'manual_qris_image_url': qris_img,
            'notes': mod_cfg.notes,
            'payment_timeout_minutes': global_cfg.payment_timeout_minutes,
        }


class ListenerDevice(models.Model):
    device_id = models.CharField(max_length=255, unique=True)
    device_name = models.CharField(max_length=255, default='HP Android')
    is_active = models.BooleanField(default=True)
    last_heartbeat = models.DateTimeField(default=timezone.now)
    last_ip = models.GenericIPAddressField(null=True, blank=True)
    last_notification_at = models.DateTimeField(null=True, blank=True)
    last_notification_preview = models.CharField(max_length=255, blank=True, default='')
    assigned_modules = models.CharField(max_length=255, blank=True, default='', help_text="Modul yang dipantau (kosong = semua)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_heartbeat']
        verbose_name = "Perangkat Barakah Listener"
        verbose_name_plural = "Perangkat Barakah Listener"

    def __str__(self):
        return f"{self.device_name} ({self.device_id[:10]}...)"
