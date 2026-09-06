from django.db import migrations
import datetime

def seed_whats_new_data(apps, schema_editor):
    WhatsNew = apps.get_model('site_content', 'WhatsNew')
    User = apps.get_model('accounts', 'User')

    admin_user = User.objects.filter(is_superuser=True).first() or User.objects.filter(role='admin').first() or User.objects.first()

    updates = [
        {
            'title': 'Pembaruan Toko UMKM: Filter & Share URL Langsung serta Peningkatan Registrasi',
            'version': 'v2.5.0',
            'tag': 'fitur_baru',
            'badge_label': 'Rilis Terbaru',
            'summary': 'Katalog Barakah Store kini mendukung filter pencarian & kategori langsung via URL yang dapat dibagikan, didukung peningkatan login Google OAuth dan sistem notifikasi keamanan akun yang lebih cerdas.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Direct URL Store Filtering: Filter pencarian, kategori, dan urutan harga/stok kini tersinkronisasi langsung di URL sehingga mudah dibagikan.',
                'Tombol Bagikan Filter: Salin atau bagikan tautan hasil pencarian produk ke WhatsApp atau media sosial dengan satu klik.',
                'Registrasi Google OAuth Lebih Cepat: Akun baru via Google kini otomatis aktif tanpa hambatan validasi nomor telepon.',
                'Sistem Keamanan Login Cerdas: Notifikasi peringatan login perangkat baru yang lebih terukur untuk perlindungan akun anggota.',
                'Pengoptimalan Performa & Kecepatan: Muat katalog produk toko dan navigasi halaman yang jauh lebih responsif dan ringan.'
            ],
            'content_html': '<p>Rilis v2.5.0 menghadirkan fleksibilitas berbelanja dan berbagi produk di <strong>Barakah Store</strong>, diiringi peningkatan kemudahan autentikasi dan keamanan akun anggota.</p>',
            'action_button_text': 'Jelajahi Barakah Store',
            'action_button_url': '/store',
            'is_published': True,
            'is_popup_on_login': True,
            'release_date': datetime.date(2026, 9, 6),
        },
        {
            'title': 'Sinergy Multi-Variasi Produk, Stok Dinamis & Sistem Ekspedisi Real-Time',
            'version': 'v2.4.0',
            'tag': 'peningkatan',
            'badge_label': 'Ekosistem Toko',
            'summary': 'Pengalaman belanja produk Sinergy UMKM kini makin lengkap dengan dukungan variasi produk (warna, ukuran, paket), stok dinamis, dan kalkulasi ongkir ekspedisi hingga tingkat kelurahan.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Dukungan Multi-Variasi Produk: Pembeli dapat memilih variasi produk secara instan seperti varian rasa, warna, ukuran, dan paket.',
                'Pilihan Alamat Pengiriman Lengkap: Penentuan tujuan pengiriman presisi dari provinsi, kota/kabupaten, kecamatan, hingga kelurahan/desa.',
                'Promo & Diskon Fleksibel: Tampilan badge diskon persentase dan label harga promo yang lebih jelas saat berbelanja.',
                'Notifikasi & Pelacakan Belanja: Konfirmasi pesanan cepat dan update status pengiriman pesanan yang transparan.'
            ],
            'content_html': '<p>Pembaruan v2.4.0 memperkokoh pengalaman berbelanja produk UMKM dengan variasi produk dan pilihan logistik pengiriman yang lengkap.</p>',
            'action_button_text': 'Kunjungi Toko',
            'action_button_url': '/store',
            'is_published': True,
            'is_popup_on_login': False,
            'release_date': datetime.date(2026, 8, 15),
        },
        {
            'title': 'Barakah Live Streaming, Presensi Digital & Notifikasi Komunitas Terpadu',
            'version': 'v2.3.0',
            'tag': 'fitur_baru',
            'badge_label': 'Interaksi Komunitas',
            'summary': 'Hadirkan interaksi komunitas lebih dekat melalui siaran Live Streaming kajian online, presensi digital acara dengan QR Code, serta notifikasi jadwal kegiatan terpadu.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Live Streaming Kajian & Event: Tonton siaran langsung kajian dan agenda komunitas dengan kualitas video adaptif HLS langsung di web & mobile.',
                'Presensi Acara & Agenda Digital: Kemudahan presensi kehadiran menggunakan scan QR Code dan akses ringkasan materi kegiatan.',
                'Notifikasi WhatsApp Pengingat: Menerima pesan konfirmasi pendaftaran kegiatan dan pengingat jadwal langsung ke nomor WhatsApp anggota.',
                'Perlindungan Keamanan Sesi: Sistem proteksi keamanan akun terpadu yang memastikan kenyamanan akses seluruh anggota.'
            ],
            'content_html': '<p>Pembaruan v2.3.0 memfasilitasi komunikasi, kehadiran kegiatan, dan kebersamaan antar anggota komunitas Barakah Economy di seluruh wilayah.</p>',
            'action_button_text': 'Lihat Agenda Komunitas',
            'action_button_url': '/events',
            'is_published': True,
            'is_popup_on_login': False,
            'release_date': datetime.date(2026, 7, 20),
        },
        {
            'title': 'Platform E-Course, Produk Digital & AI Assistant Muamalah 24/7',
            'version': 'v2.2.0',
            'tag': 'fitur_baru',
            'badge_label': 'Edukasi & Digital',
            'summary': 'Peluncuran modul pembelajaran digital (E-Course), marketplace produk digital (e-book, tools), serta asisten cerdas AI untuk konsultasi muamalah kapan saja.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Portal E-Course & Sertifikat: Modul kelas online interaktif, kuis kelulusan, dan penerbitan sertifikat digital ber-barcode.',
                'Marketplace Produk Digital: Akses dan unduh instan e-book, dokumen, template, dan materi digital dengan aman.',
                'AI Assistant Barakah: Konsultasi hukum muamalah syariah dan panduan platform berbasis kecerdasan buatan.',
                'Keamanan Sesi Multi-Device: Pantau perangkat yang sedang login pada akun Anda dengan tombol darurat logout 1-klik.'
            ],
            'content_html': '<p>Pembaruan v2.2.0 memperluas cakupan Barakah Economy ke ranah literasi ekonomi syariah dan digitalisasi produk non-fisik.</p>',
            'action_button_text': 'Jelajahi E-Course',
            'action_button_url': '/ecourse',
            'is_published': True,
            'is_popup_on_login': False,
            'release_date': datetime.date(2026, 6, 10),
        },
        {
            'title': 'Sistem Kaderisasi Anggota, Verifikasi Profil & Crowdfunding Donasi',
            'version': 'v2.1.0',
            'tag': 'peningkatan',
            'badge_label': 'Kaderisasi & Sosial',
            'summary': 'Peningkatan sistem pendataan jenjang kaderisasi anggota BAE, kemudahan verifikasi identitas profil, serta portal donasi sosial terpadu.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Jenjang Kaderisasi Terstruktur: Pantau progress keikutsertaan Kelas Academy dan status keaktifan komunitas.',
                'Verifikasi Identitas Praktis: Pengisian data identitas lebih cepat dengan pembacaan otomatis saat verifikasi profil.',
                'Portal Donasi & Crowdfunding: Transparansi penyaluran bantuan sosial dengan laporan progress dan konfirmasi donasi otomatis.',
                'Forum Diskusi Komunitas: Ruang berbagi pengalaman, tanya jawab muamalah, dan kolaborasi antar anggota.'
            ],
            'content_html': '<p>Pembaruan v2.1.0 memperkuat tata kelola keanggotaan dan sinergi sosial kemanusiaan dalam ekosistem Barakah Economy.</p>',
            'action_button_text': 'Lihat Program Donasi',
            'action_button_url': '/charity',
            'is_published': True,
            'is_popup_on_login': False,
            'release_date': datetime.date(2026, 5, 2),
        },
        {
            'title': 'Grand Launching: Barakah Economy Community Platform 2.0',
            'version': 'v2.0.0',
            'tag': 'pengumuman',
            'badge_label': 'Major Release',
            'summary': 'Peluncuran perdana platform Barakah Economy generasi baru berbasis arsitektur SPA modern dengan integrasi menyeluruh antar pilar ekonomi dan sosial.',
            'content_type': 'bullet_list',
            'bullet_items': [
                'Arsitektur Baru & Desain Modern: Desain antarmuka responsif bernuansa hijau halal (Emerald Halal Theme) dengan navigasi intuitif.',
                'Single Sign-On (SSO) & Akun Terpadu: Satu akun untuk mengakses seluruh layanan toko, donasi, kelas, dan keanggotaan.',
                'PWA & Web Mobile First: Akses cepat dan ringan di browser desktop maupun perangkat smartphone.',
                'Pusat Notifikasi & Riwayat Transaksi: Pantau pesanan, donasi, dan keaktifan kegiatan secara transparan.'
            ],
            'content_html': '<p>Selamat datang di <strong>Barakah Economy 2.0</strong>! Ekosistem digital terpadu untuk memberdayakan ekonomi umat, menjalin ukhuwah, dan membangun kemandirian finansial yang berkah.</p>',
            'action_button_text': 'Jelajahi Beranda',
            'action_button_url': '/',
            'is_published': True,
            'is_popup_on_login': False,
            'release_date': datetime.date(2026, 3, 1),
        }
    ]

    for up in updates:
        WhatsNew.objects.update_or_create(
            version=up['version'],
            defaults={
                **up,
                'created_by': admin_user
            }
        )

def reverse_seed(apps, schema_editor):
    WhatsNew = apps.get_model('site_content', 'WhatsNew')
    WhatsNew.objects.filter(version__in=['v2.5.0', 'v2.4.0', 'v2.3.0', 'v2.2.0', 'v2.1.0', 'v2.0.0']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('site_content', '0021_whatsnewfeaturesuggestion'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_whats_new_data, reverse_seed),
    ]
