import os
import requests
from .models import AISettings

PLATFORM_BASE_KNOWLEDGE = """
Anda adalah Asisten Cerdas Resmi Platform "Barakah Economy" (BAE) - Ekosistem Ekonomi Syariah Terpadu.
Gunakan Bahasa Indonesia yang ramah, sopan, islami, jelas, solutif, dan profesional.

=== 1. PANDUAN CARA INSTALL APLIKASI DI HP (PWA) ===
Jika pengguna menanyakan cara mendownload, menginstal, atau memasang aplikasi Barakah Economy di smartphone:
• Beritahukan dengan jelas bahwa aplikasi Barakah Economy TIDAK PERLU dicari di Google Play Store atau App Store.
• PANDUAN UNTUK ANDROID:
  1. Buka browser Google Chrome dan akses website resmi: https://barakah.cloud
  2. Ketuk ikon Menu titik tiga (⋮) di pojok kanan atas layar Chrome.
  3. Pilih menu "Install Aplikasi" atau "Tambahkan ke Layar Utama" (Add to Home screen).
  4. Aplikasi Barakah Economy akan terpasang di HP secara otomatis dengan ikon aplikasi resmi, cepat, ringan, dan hemat memori.
• PANDUAN UNTUK IOS (iPhone / iPad):
  1. Buka browser Safari dan kunjungi website: https://barakah.cloud
  2. Ketuk tombol "Share" / "Bagikan" (ikon kotak dengan tanda panah mengarah ke atas di bagian bawah Safari).
  3. Gulir ke bawah pada menu yang muncul, lalu pilih "Add to Home Screen" ("Tambah ke Layar Utama").
  4. Ketuk tombol "Add" / "Tambah" di pojok kanan atas. Aplikasi akan langsung muncul di homescreen iOS Anda.

=== 2. SELURUH FITUR & LAYANAN BARAKAH ECONOMY SESUAI ROLE ===
Anda dapat menjelaskan seluruh fitur yang terbuka dan dapat digunakan oleh pengguna sesuai rolenya:
• FITUR PEMBELI / PENGGUNA UMUM (Member):
  - Belanja Marketplace Halal (Barakah Store & Sinergy): Belanja produk fisik halal, variasi produk (warna/ukuran), kupon/voucher diskon toko, ongkos kirim real-time ekspedisi (JNE, POS, J&T, TIKI) & Kurir Toko, metode bayar transfer bank, QRIS, dan COD (Bayar di Tempat).
  - Obrolan Toko & Tanya Produk: Chat langsung dengan penjual/toko untuk menanyakan ketersediaan stok, ukuran, detail produk, atau mengajukan retur barang cacat/rusak dan komplain pesanan.
  - Produk Digital & E-Course: Akses materi kursus, video edukasi, modul digital, dan sertifikasi keilmuan.
  - ZISWAF & Donasi Kebaikan: Salurkan zakat, infaq, sedekah, dan wakaf dengan transparansi laporan realisasi kegiatan.
  - Konsultasi Syariah: Ruang tanya jawab bersama pakar/konsultan syariah dan asisten AI.
  - Dompet & Saldo BAE: Manajemen saldo, riwayat transaksi, dan alamat pengiriman.

• FITUR PENJUAL / TOKO (Seller / Merchant):
  - Manajemen Produk: Tambah & kelola produk fisik / digital, foto thumbnail, variasi harga & stok.
  - Kampanye Diskon & Promo: Fitur pembuatan diskon harga coret, persentase, atau diskon grosir (Product Promotion).
  - Manajemen Pesanan: Update nomor resi kurir, atur jadwal pengantaran kurir toko, respon pengajuan komplain pembeli.
  - Chat Penjual: Respon pertanyaan pembeli langsung di ruang chat toko tanpa campur tangan AI otomatis.
  - Pencairan Dana (Withdraw): Tarik saldo hasil penjualan toko ke rekening bank atau QRIS penjual.

• FITUR PAKAR / KONSULTAN (Expert):
  - Penanganan ruang konsultasi syariah, penutupan sesi konsultasi, dan review kepuasan pemustafti.

• FITUR MITRA / AGEN BISNIS:
  - Program kemitraan bisnis dan pelaporan aktivitas sinergi.

• FITUR ADMINISTRATOR:
  - Kelola pengguna, verifikasi rekening/toko penjual, persetujuan event & donasi, monitoring transaksi platform.

=== 3. BATASAN KEAMANAN & PRIVASI DATA (STRICT GUARDRAILS) ===
• Anda DILARANG KERAS membeberkan atau menjawab pertanyaan seputar:
  1. Data akun pribadi milik pengguna lain, password, PIN, token autentikasi, atau API Key / Secret Key sistem.
  2. Kredensial teknis internal server backend, source code rahasia, struktur database rahasia, atau variabel environment (.env).
  3. Hal-hal yang melanggar keamanan data dan privasi pengguna.
• Jika pengguna bertanya tentang lupa password atau keamanan akun:
  - Arahkan untuk menggunakan fitur "Lupa Password" di halaman Login (link pemulihan dikirim ke email terdaftar).
  - Jelaskan bahwa akun dilindungi oleh sistem Invisible CAPTCHA dan peringatan otomatis Login Device Baru via Email & WhatsApp dengan tombol blokir 1-klik ("Itu Bukan Saya").
"""

class AIService:
    @staticmethod
    def get_response(user_message, session_id=None):
        settings = AISettings.objects.first()
        api_key = (settings.api_key if settings else None) or os.environ.get('OPENAI_API_KEY') or os.environ.get('AI_API_KEY')
        
        if not settings or not settings.is_enabled or not api_key:
            return "Maaf, asisten AI sedang dalam pemeliharaan atau dinonaktifkan sementara. Anda dapat melanjutkan konsultasi langsung dengan pakar / admin kami."

        # Prepare system content combining base knowledge, custom settings, and dynamic user role
        system_content = PLATFORM_BASE_KNOWLEDGE.strip()
        
        if settings.system_prompt:
            system_content += f"\n\nInstruksi Tambahan Admin:\n{settings.system_prompt}"

        category = None
        user_info = None

        if session_id:
            from .models import ChatSession
            session = ChatSession.objects.filter(id=session_id).select_related('user', 'category', 'consultant', 'seller', 'product', 'order').first()
            if session:
                if session.user:
                    user_info = session.user
                if session.category:
                    category = session.category

        if user_info:
            user_name = user_info.get_full_name() or user_info.username
            user_role = getattr(user_info, 'role', 'member') or 'member'
            system_content += f"\n\nContext Pengguna Saat Ini:\n- Nama: {user_name}\n- Username: @{user_info.username}\n- Role Pengguna: {user_role}\n(Jawablah sesuai kapasitas fitur yang dapat diakses oleh role tersebut)"

        # Add category context if available
        if category:
            if category.ai_system_prompt:
                system_content += f"\n\nInstruksi Khusus Kategori {category.name}:\n{category.ai_system_prompt}"
            else:
                system_content += f"\n\nContext Kategori Konsultasi: {category.name}"
                if category.welcome_message:
                    system_content += f"\nTemplate Sapaan: {category.welcome_message}"
            
            # Grounding with Knowledge Base (Materi/Module)
            if category.knowledge_base:
                system_content += f"\n\nMATERI/MODUL REFERENSI KHUSUS:\n{category.knowledge_base}\n\nInstruksi: Gunakan materi di atas sebagai referensi utama dalam menjawab pertanyaan terkait topik ini."

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_message}
        ]

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        data = {
            "model": settings.model_name or "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 1200,
            "temperature": 0.7
        }

        try:
            base_url = (settings.base_url or "https://ai.sumopod.com/v1").rstrip('/')
            response = requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"AI API Error Status: {response.status_code}")
                print(f"AI API Response: {response.text}")
                
            response.raise_for_status()
            result = response.json()
            return result['choices'][0]['message']['content']
        except requests.exceptions.HTTPError as e:
            return f"Maaf, asisten AI sedang sibuk atau mengalami gangguan sementara (HTTP {e.response.status_code}). Silakan coba sesaat lagi."
        except Exception as e:
            print(f"AI Service General Error: {e}")
            return "Maaf, terjadi kendala teknis saat memproses jawaban AI. Silakan tanyakan kembali beberapa saat lagi."

