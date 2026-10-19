# Generated manually for OutgoingFund
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('transactions', '0001_initial'),
        ('digital_products', '0003_digitalorder_product_owner_digitalproduct_visibility_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='OutgoingFund',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fund_account', models.CharField(choices=[('commercial', 'Rekening Komersial (Store, Event, Digital, E-Course)'), ('charity', 'Rekening Charity / Sosial (Donasi & ZIS)')], default='commercial', max_length=20)),
                ('category', models.CharField(choices=[('operational', 'Operasional & Utilitas'), ('charity_distribution', 'Penyaluran Donasi / Mustahik'), ('withdrawal', 'Penarikan Dana User / Seller'), ('vendor_supplier', 'Vendor / Supplier / Pengadaan'), ('event_cost', 'Biaya Operasional Event'), ('tax_admin', 'Pajak & Biaya Admin'), ('other', 'Pengeluaran Lainnya')], default='operational', max_length=30)),
                ('title', models.CharField(max_length=255)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('description', models.TextField(blank=True, default='')),
                ('recipient_name', models.CharField(blank=True, default='', max_length=150)),
                ('recipient_account', models.CharField(blank=True, default='', max_length=150)),
                ('proof_file', models.ImageField(blank=True, null=True, upload_to='expense_proofs/')),
                ('status', models.CharField(choices=[('pending', 'Pending (Menunggu Proses)'), ('completed', 'Selesai (Sudah Dicairkan / Ditransfer)'), ('cancelled', 'Dibatalkan')], default='completed', max_length=20)),
                ('transaction_date', models.DateField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recorded_expenses', to=settings.AUTH_USER_MODEL)),
                ('withdrawal_request', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='outgoing_fund_entries', to='digital_products.withdrawalrequest')),
            ],
            options={
                'verbose_name': 'Pengeluaran / Uang Keluar',
                'verbose_name_plural': 'Pengeluaran / Uang Keluar',
                'ordering': ['-transaction_date', '-created_at'],
            },
        ),
    ]
