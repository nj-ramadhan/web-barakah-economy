# 🏛️ BLUEPRINT.MD — Barakah Economy System Architecture & Feature Blueprint

> **Dokumen Arsitektur Teknis & Panduan Pengembangan Resmi (Master Blueprint)**  
> *Wajib dijadikan acuan utama sebelum menambahkan, mengubah model database, memperbarui logika bisnis, atau merombak alur sistem platform Barakah Economy (BAE).*

---

## 1. Ikhtisar Sistem & Visi Arsitektur

**Barakah Economy (BAE)** adalah platform ekosistem ekonomi syariah terpadu yang memadukan aktivitas **komersial** (E-Commerce, Produk Digital, E-Course, Event, Jasa, Landing Page) dan aktivitas **filantropi Islam / sosial** (Charity, Zakat, Infaq, Sedekah, Kotak Amal).

Sistem dirancang dengan arsitektur **Clean Decoupled Architecture**:
- **Backend**: Django 5.x + Django REST Framework (DRF) + Python 3.11
- **Frontend**: React.js 18 (SPA) + Tailwind CSS + Axios
- **Database**: PostgreSQL 15+ (Production via Docker `bae_postgres`)
- **Web Server & Reverse Proxy**: Nginx + Gunicorn
- **Push Notification Listener**: Android Native Kotlin App (`barakah_android_listener`)
- **Live Streaming / RTMP**: MediaMTX (`bae_mediamtx` & `bae_rtmp`)
- **Deployment**: Docker Compose dengan script otomatisasi `deploy.sh`

---

## 2. Tujuh Modul Transaksi Utama (The 7 Pillars)

Setiap transaksi finansial di platform dikelompokkan ke dalam 7 modul utama:

| No | Modul (`module_code`) | Domain Bisnis | Tipe Rekening Kas | Model Transaksi Terkait |
|:---:|---|---|:---:|---|
| **1** | `charity` | Donasi, Zakat, Infaq, Sedekah, Kotak Amal | **Charity / Sosial** | `donations.Donation` |
| **2** | `event` | Registrasi Event, Tiket Acara, Webinar | **Komersial** | `events.EventRegistration` |
| **3** | `digital` | E-Book, Template, File Unduhan, Software | **Komersial** | `digital_products.DigitalOrder` |
| **4** | `ecourse` | Kelas Online, Video Kursus, Kurikulum | **Komersial** | `courses.CourseEnrollment` |
| **5** | `store` | Toko Sinergy, E-Commerce Produk Fisik & Kuliner | **Komersial** | `orders.Order` |
| **6** | `landing_page` | Tambah Slot & Perpanjangan Masa Aktif Landing Page | **Komersial** | `products.LandingPageSlotOrder` |
| **7** | `service` | Biaya Publikasi & Perpanjangan Listing Jasa 30 Hari | **Komersial** | `products.ServicePaymentOrder` |

---

## 3. Sistem Pembayaran & Plotting Multi-Modul (Payment Engine)

### A. Konsep Plotting Modular (`ModulePaymentSetting`)
Setiap modul di atas memiliki fleksibilitas konfigurasi pembayaran:
1. **Inherit Global (Default)**: Menggunakan pengaturan rekening & DynaQRIS global dari model `PaymentSetting`.
2. **Plot Kustom (`is_custom = True`)**: Modul memiliki:
   - Mode Pembayaran spesifik: `dynaqris` (otomatis), `manual` (QRIS statis / transfer), atau `default`.
   - Kredensial DynaQRIS khusus (`dynaqris_api_key` & `dynaqris_qris_id`).
   - Rekening Bank tersendiri (`bank_name`, `account_number`, `account_name`).
   - Foto QRIS Statis khusus per modul (`manual_qris_image`).

### B. Dynamic QRIS Algorithm (`DynaQRISService`)
1. **Anti-Spam Rate Limiter**: Mencegah pembuatan invoice berulang per user/IP dalam cooldown 10 detik.
2. **Kode Unik Acak (Nominal Randomizer)**:
   - **Modul `event`**: Rentang kode unik `1` s/d `100`. Registrasi berstatus approved memblokir kode unik selama 2 jam (rotasi reset 2 jam); registrasi pending memblokir kode selama batas countdown timeout (hangus jika expired/batal).
   - **Modul lainnya**: Rentang kode unik `1` s/d `500` selama batas waktu pembayaran (default 5 menit).
3. **Endpoint Publik Berbasis Modul**:
   - `GET /api/payments/config/?module={module_code}` mengembalikan konfigurasi efektif tanpa membocorkan API key privat.

---

## 4. Barakah Android Listener & Multi-Device Hub

Sistem menerima notifikasi transfer bank (BSI, BCA, Mandiri, BRI, DANA, GoPay, OVO, ShopeePay) dari HP Android secara realtime tanpa payment gateway berbayar.

### A. Fitur Multi-Login (No 1-Device Lock)
- HP Android yang terpasang aplikasi `barakah_android_listener` mencatat heartbeat ke `/api/payments/webhook/heartbeat/`.
- Model `ListenerDevice` merekam setiap HP secara independen (`device_id`, `device_name`, `last_heartbeat`, `last_ip`, `last_notification_preview`).
- **Aturan Arsitektur**: Endpoint heartbeat **selalu mengembalikan `is_primary: True`**. Tidak boleh ada penguncian 1 perangkat (1-device lock) yang menendang perangkat lain. Banyak HP (HP Kasir Toko, HP Bendahara Donasi, HP Admin Event) dapat aktif bersamaan.

### B. Webhook Parsing & Auto-Verification
- Notifikasi diterima di `POST /api/payments/webhook/android-notification/`.
- Regex engine membedah teks SMS / push notifikasi dan mengekstrak nominal rupiah.
- Sistem secara berurutan mencocokkan nominal uang masuk ke seluruh 7 modul pending:
  1. `orders.Order` (`ecommerce`/`store`)
  2. `digital_products.DigitalOrder` (`digital`)
  3. `courses.CourseEnrollment` (`ecourse`)
  4. `events.EventRegistration` (`event`)
  5. `donations.Donation` (`charity`)
  6. `products.LandingPageSlotOrder` (`landing_page`)
  7. `products.ServicePaymentOrder` (`service`)
- Jika cocok, status pembayaran otomatis disetel ke `paid`/`verified` dan webhook mengirim notifikasi invoice/email ke buyer & seller.

---

## 5. Manajemen Arus Kas & Rekonsiliasi 2 Rekening

Keuangan platform dipisahkan secara tegas menurut prinsip syariah:

```
                          ┌────────────────────────┐
                          │   TOTAL UANG MASUK     │
                          └───────────┬────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│   REKENING KOMERSIAL    │                         │    REKENING CHARITY     │
│ (Store, Event, Digital, │                         │ (Donasi, ZIS, Infaq,    │
│  E-Course, Landing,     │                         │  Program Kemanusiaan)   │
│  Jasa)                  │                         │                         │
└───────────┬─────────────┘                         └───────────┬─────────────┘
            │                                                   │
            ▼ (-) Pengeluaran Komersial                         ▼ (-) Penyaluran Donasi
┌─────────────────────────┐                         ┌─────────────────────────┐
│   Sisa Kas Komersial    │                         │    Sisa Kas Charity     │
│   (Di Rekening Bank)    │                         │   (Di Rekening Sosial)  │
└─────────────────────────┘                         └─────────────────────────┘
```

### A. Model Pengeluaran (`OutgoingFund`)
Tabel `transactions_outgoingfund` mencatat:
- `fund_account`: `commercial` vs `charity`
- `category`: Operasional, Penyaluran Donasi, Penarikan Dana Seller (`withdrawal`), Vendor/Supplier, Biaya Event, Pajak, Lainnya.
- `amount`, `title`, `description`, `recipient_name`, `recipient_account`, `proof_file`.
- `status`: `pending`, `completed`, `cancelled`.
- Relasi opsional ke `withdrawal_request` (`digital_products.WithdrawalRequest`).

### B. Rekonsiliasi Sisa Saldo Riil
- **Total Masuk**: Dihitung dari seluruh transaksi berstatus sukses (`paid`/`verified`/`approved`).
- **Total Keluar**: Dihitung dari pengeluaran berstatus `completed`.
- **Sisa Kas di Bank**: `Total Uang Masuk - Total Uang Keluar (Completed)`.
- **Pending Outgoing**: Penarikan seller atau pengeluaran yang berstatus `pending` disajikan terpisah sebagai komitmen dana yang harus disiapkan.

---

## 6. Standar Penambahan & Modifikasi Fitur (Developer SOP)

Ketika hendak menambahkan fitur baru atau mengganti model, ikuti panduan berikut:

### 1. Konsultasi Dokumen Wajib
- Selalu tinjau `design.md` untuk aturan warna, komponen, dan sudut lengkung UI.
- Selalu tinjau `blueprint.md` untuk kepatuhan relasi database dan pembagian modul.

### 2. Aturan Pembuatan Migrasi Django
- **PENTING**: Di Django migrations, Primary Key otomatis harus ditulis dengan `auto_created=True`:
  ```python
  # BENAR:
  ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'))
  
  # SALAH (Menyebabkan error TypeError):
  ('id', models.BigAutoField(auto_now_created=True, ...))
  ```

### 3. Integritas Pembayaran & Saldo
- Setiap kali menambahkan model transaksi berbayar baru, wajib:
  1. Daftarkan di salah satu dari 7 modul atau buat modul ke-8 di `MODULE_DEFINITIONS` & `ModulePaymentSetting`.
  2. Tambahkan pengecekan matching di `AndroidNotificationWebhookView` (`payments/views.py`).
  3. Masukkan perhitungan agregasi uang masuk di `AdminIncomingFundsView` (`transactions/views.py`).

### 4. Siklus Pengujian & Rilis
1. Verifikasi sintaks Python: `python -m py_compile path/to/file.py`.
2. Verifikasi JavaScript/React: `node -c path/to/file.js` atau uji komponen.
3. Commit ke Git dengan pesan deskriptif: `feat(...)`, `fix(...)`, `refactor(...)`.
4. Deploy ke server VPS melalui `./deploy.sh`.
