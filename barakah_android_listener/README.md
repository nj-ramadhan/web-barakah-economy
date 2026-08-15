# 📱 Barakah Notif Listener (Android App) & Webhook Auto-Verify

Aplikasi Android Native (Kotlin) & Webhook Backend untuk membaca notifikasi transaksi m-Banking / E-Wallet secara real-time di HP Android Pengurus dan memverifikasi pembayaran secara otomatis 100% tanpa Payment Gateway!

---

## 🚀 Fitur Utama
1. **NotificationListenerService 24/7**: Berjalan di background hemat baterai untuk memantau notifikasi uang masuk.
2. **Ekstraksi Nominal Cerdas**: Mendukung berbagai format mata uang m-Banking (BSI, BCA, Mandiri Livin, BRImo, BNI, DANA, GoPay, OVO, ShopeePay, SeaBank, Jenius, OCTO Mobile, dll).
3. **Multi-Platform Auto-Verify**: Otomatis memverifikasi pendaftaran Event, Donasi, Pesanan E-commerce, Produk Digital, dan E-Course saat notifikasi cocok.
4. **Tool Simulasi & Uji Coba Real-Time**:
   - Uji coba langsung dari **Dashboard Admin Website** (`/admin/payment-settings`).
   - Tombol **Simulasi Notifikasi Masuk** langsung di aplikasi HP Android.
   - Mode Uji Coba untuk menerima notifikasi dari aplikasi apa pun (WhatsApp, SMS, dll).
5. **Autentikasi Aman**: Didukung secret token `X-Android-Secret`.

---

## 🧪 Panduan Cara Uji Coba (3 Cara Mudah)

### Cara 1: Uji Coba Cepat via Dashboard Admin Website (Tanpa HP)
1. Buka menu **Admin Payment Settings** di website (`/admin/payment-settings`).
2. Scroll ke bagian **"Uji Coba & Simulasi Webhook Notifikasi"**.
3. Pilih salah satu template (misal: *BSI Mobile Rp 50.000*) atau ketik notifikasi kustom.
4. Klik **"Kirim Uji Coba ke Webhook"**.
5. Sistem akan menampilkan status deteksi nominal dan konfirmasi transaksi pending yang berhasil diverifikasi secara visual!

### Cara 2: Uji Coba Simulasi via Aplikasi HP Android
1. Buka aplikasi **Barakah Notif Listener** di HP.
2. Klik tombol **"🚀 Kirim Simulasi Notifikasi Bank Masuk"**.
3. Pilih bank & nominal (misal: BSI Mobile Rp 50.000 atau nominal kustom).
4. Aplikasi akan langsung mengirim payload ke webhook server dan menampilkan respons verifikasi di layar log console.

### Cara 3: Uji Coba Notifikasi Asli (WhatsApp / SMS / Transfer Asli)
1. Di aplikasi Android, aktifkan opsi **"🧪 Mode Uji Coba: Baca notifikasi dari semua aplikasi (WA/SMS/DLL)"**.
2. Kirim pesan WhatsApp / SMS ke HP tersebut dengan format contoh:
   *`"BSI Mobile: Transfer masuk sebesar Rp 50.000 dari Fulan"`*
3. Aplikasi akan langsung membaca push notifikasi WhatsApp tersebut dan meneruskannya ke webhook server untuk auto-verifikasi!

---

## 🛠️ Cara Build APK di Android Studio

1. Buka **Android Studio** $\rightarrow$ **Open** $\rightarrow$ arahkan ke folder `barakah_android_listener`.
2. Klik **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
3. Install file `app-debug.apk` di HP Android Pengurus.
4. Buka aplikasi, aktifkan **Izin Notifikasi**, masukkan URL Webhook & Secret Token, lalu klik **Simpan Pengaturan**.

