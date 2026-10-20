# Generated manually for Barakah Economy Module Payment Setting & Multi-device Listener

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_paymentsetting_listener_device_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModulePaymentSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module_code', models.CharField(choices=[('charity', 'Charity & ZISWAF (Donasi)'), ('event', 'Event & Tiket'), ('digital', 'Produk Digital'), ('ecourse', 'E-Course & Kelas Online'), ('store', 'Produk Toko / Store (E-Commerce)'), ('landing_page', 'Landing Page Builder'), ('service', 'Jasa & Layanan')], max_length=30, unique=True)),
                ('module_title', models.CharField(max_length=100)),
                ('is_custom', models.BooleanField(default=False, help_text='Aktifkan plot pengaturan khusus untuk modul ini')),
                ('payment_mode', models.CharField(choices=[('default', 'Gunakan Pengaturan Global'), ('dynaqris', 'DynaQRIS Otomatis Saja'), ('manual', 'QRIS Statis & Transfer Manual Saja'), ('both', 'Keduanya (User Memilih)')], default='default', max_length=20)),
                ('dynaqris_api_key', models.CharField(blank=True, default='', max_length=255)),
                ('dynaqris_qris_id', models.CharField(blank=True, default='', max_length=255)),
                ('bank_name', models.CharField(blank=True, default='', max_length=100)),
                ('account_number', models.CharField(blank=True, default='', max_length=100)),
                ('account_name', models.CharField(blank=True, default='', max_length=100)),
                ('manual_qris_image', models.ImageField(blank=True, null=True, upload_to='payment_settings/modules/')),
                ('notes', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Plotting QRIS & Pembayaran Modul',
                'verbose_name_plural': 'Plotting QRIS & Pembayaran Modul',
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='ListenerDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_id', models.CharField(max_length=255, unique=True)),
                ('device_name', models.CharField(default='HP Android', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('last_heartbeat', models.DateTimeField(default=django.utils.timezone.now)),
                ('last_ip', models.GenericIPAddressField(blank=True, null=True)),
                ('last_notification_at', models.DateTimeField(blank=True, null=True)),
                ('last_notification_preview', models.CharField(blank=True, default='', max_length=255)),
                ('assigned_modules', models.CharField(blank=True, default='', help_text='Modul yang dipantau (kosong = semua)', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Perangkat Barakah Listener',
                'verbose_name_plural': 'Perangkat Barakah Listener',
                'ordering': ['-last_heartbeat'],
            },
        ),
    ]
