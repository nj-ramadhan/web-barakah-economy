# 📱 Barakah Notif Listener (Android App)

Aplikasi Android Native (Kotlin) khusus untuk membaca notifikasi transaksi m-Banking / E-Wallet secara real-time di HP Android Pengurus dan mengirimkannya ke Server **Barakah Economy** (`https://api.barakah.cloud`).

---

## 🚀 Fitur Utama
1. **NotificationListenerService**: Berjalan otomatis di background HP Android.
2. **Filtering Otomatis**: Memfilter notifikasi bank (BSI Mobile, BCA, Mandiri, DANA, OVO, GoPay, ShopeePay).
3. **HTTP Webhook Realtime**: Mengirimkan notifikasi ke backend Django dengan autentikasi `X-Android-Secret`.
4. **Log Console Dashboard**: Menampilkan log pengiriman webhook secara realtime di layar HP.
5. **Fitur Tes Webhook**: Tombol simpan dan tes koneksi langsung dari HP.

---

## 🛠️ Cara Membuka & Build APK di Android Studio

### 1. Buka Project
1. Jalankan **Android Studio**.
2. Pilih **Open** $\rightarrow$ Arahkan ke folder:
   `d:\Galang\BAE\website\web bae\web-barakah-economy\barakah_android_listener`
3. Tunggu Android Studio selesai mendownload Gradle dependencies (Sync Project with Gradle Files).

### 2. Build File APK
1. Di menu atas Android Studio, klik **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
2. Tunggu hingga proses kompilasi selesai.
3. Klik link **locate** di notifikasi pojok kanan bawah untuk membuka file `.apk` hasil build:
   `app/build/outputs/apk/debug/app-debug.apk`.
4. Kirim file `.apk` tersebut ke HP Android Pengurus dan **install**.

---

## 📱 Cara Penggunaan di HP Android Pengurus

1. Buka aplikasi **Barakah Notif Listener** di HP Android.
2. Klik tombol **Buka Akses Izin Notifikasi** $\rightarrow$ Aktifkan izin untuk **Barakah Notif Listener**.
3. Masukkan **Webhook URL**:
   `https://api.barakah.cloud/api/payments/webhook/android-notification/`
4. Masukkan **Secret Token** (sesuaikan dengan yang diatur di Dashboard Admin Payment Settings).
5. Klik **Simpan Pengaturan**, lalu klik **Tes Webhook** untuk memastikan koneksi ke server berhasil (`✓ Tes Webhook Berhasil`).
6. Selesai! Aplikasi akan terus berjalan diam-diam di HP Android Anda. Setiap ada transfer QRIS masuk, transaksi di website akan **otomatis 100% lunas & e-tiket terkirim!**
