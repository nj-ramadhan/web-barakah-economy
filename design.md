# 🎨 DESIGN.MD — Barakah Economy UI/UX Design System & Standards

> **Dokumen Panduan Visual & Desain Resmi Barakah Economy (BAE)**  
> *Wajib dibaca dan dipatuhi oleh developer maupun AI Assistant sebelum membuat, mengubah, atau memperluas antarmuka pengguna (UI/UX) di seluruh halaman platform Barakah Economy.*

---

## 1. Filosofi Desain (Design Philosophy)

Barakah Economy mengusung identitas **Modern Islamic FinTech & Community Ecosystem**:
1. **Bersih, Tenang, & Elegan (Clean & Serene)**: Desain tidak ramai, bernuansa lapang (*generous whitespace*), modern tanpa kesan kuno/kaku.
2. **Amanah & Transparan (Trust & Transparency)**: Informasi transaksi, status rekening, dan data keuangan disajikan dengan sangat jelas, mudah dibaca, dan tidak membingungkan.
3. **Harmonis & 1 Tema (Consistent Theme)**: Setiap halaman (Dashboard, Admin, Store, Event, Donasi, dsb.) harus menggunakan token visual, sudut lengkung (*border-radius*), dan palet warna yang seragam.
4. **Mobile-First & Responsif**: Platform diakses mayoritas melalui smartphone, sehingga seluruh komponen tombol, tabel, dan kartu wajib ramah sentuhan (*touch-friendly*).

---

## 2. Palet Warna (Color Palette & Tokens)

Seluruh komponen styling menggunakan Tailwind CSS utility classes dengan palet terkurasi:

### A. Warna Utama (Primary - Islamic Emerald)
Mencerminkan nilai syariah, keberkahan, kemakmuran, dan ketenangan.
- `emerald-50`: `#ecfdf5` (Background halus, banner aktif, card highlight)
- `emerald-100`: `#d1fae5` (Badge, border highlight)
- `emerald-600`: `#059669` (Tombol aksi utama, ikon aktif, toggle)
- `emerald-700`: `#047857` (Hover tombol utama, judul section)
- `emerald-800`: `#065f46` (Heading teks gelap, badge teks)
- `emerald-900`: `#064e3b` (Teks kontras tinggi)

### B. Warna Aksen & Finansial (Secondary & Commercial)
- **Teal / Cyan**: `#0d9488` / `teal-600` — Digunakan untuk elemen konektivitas (Barakah Listener, integrasi teknis, status online).
- **Amber / Gold**: `#d97706` / `amber-600` — Digunakan untuk kategori Charity/ZISWAF, uang kas, bintang rating, dan badge premium.
- **Blue / Indigo**: `#2563eb` / `indigo-600` — Digunakan untuk modul Event & Tiket serta Produk Digital.
- **Purple / Violet**: `#7c3aed` / `purple-600` — Digunakan untuk modul E-Course & Kelas Online.
- **Rose / Pink**: `#e11d48` / `rose-600` — Digunakan untuk modul Jasa & Layanan serta alert error/pengeluaran.

### C. Warna Netral & Permukaan (Neutrals & Backgrounds)
- **Background Halaman**: `bg-slate-50` (`#f8fafc`) atau `bg-gray-50` (`#f9fafb`)
- **Card Surface**: `bg-white` dengan border halus `border-slate-200` atau `border-gray-100`
- **Surface Gelap (Live Tools / Simulator / Terminal)**: `bg-slate-900` (`#0f172a`) dengan teks aksen hijau `text-emerald-400`
- **Border Default**: `border-slate-200` (`#e2e8f0`)
- **Teks Utama**: `text-slate-800` (`#1e293b`)
- **Teks Sekunder**: `text-slate-500` (`#64748b`)
- **Teks Redup / Caption**: `text-slate-400` (`#94a3b8`)

### D. Warna Status Semantik
- **Success / Paid / Online**: `bg-emerald-100 text-emerald-800 border-emerald-200` dengan titik `bg-emerald-500 animate-pulse`
- **Pending / Waiting**: `bg-amber-100 text-amber-800 border-amber-200`
- **Cancelled / Error / Offline**: `bg-rose-100 text-rose-800 border-rose-200`
- **Info / Draft**: `bg-blue-100 text-blue-800 border-blue-200`

---

## 3. Tipografi & Hirarki Teks

- **Font Family**: Menggunakan font sans-serif modern (Inter, Outfit, atau Google Fonts sans default).
- **Font Weighting**:
  - `font-black` (900/800): Judul Halaman Utama (`text-2xl font-black`), angka saldo KPI (`text-3xl font-black`).
  - `font-bold` (700): Subjudul section, label tombol, nama modul.
  - `font-semibold` (600): Form label, nama tabel header.
  - `font-medium` / `font-normal` (400-500): Deskripsi, isi paragraf, teks pendukung.
  - `font-mono`: Nomor rekening, token secret, URL webhook, nominal angka di input kalkulasi, API keys (`text-xs font-mono`).

---

## 4. Sistem Sudut Lengkung (Border Radius) & Bayangan (Shadows)

Konsistensi sudut lengkung adalah kunci identitas Barakah Economy:
- **Kartu Utama / Container Halaman**: `rounded-3xl` (24px)
- **Sub-Kartu / Kotak Fitur / Tab Container**: `rounded-2xl` (16px)
- **Tombol / Input Form / Modal Box**: `rounded-xl` (12px) atau `rounded-2xl`
- **Badge / Pill / Tag**: `rounded-full` (9999px)
- **Shadow**: Menggunakan shadow lembut alami `shadow-sm` atau `shadow-md`, hindari shadow gelap kasar. Contoh: `shadow-lg shadow-emerald-700/20`.

---

## 5. Standar Komponen UI

### A. Kartu KPI Keuangan / Statistik (Metric Cards)
```jsx
<div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kas Komersial</span>
    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
      <span className="material-icons text-xl">account_balance_wallet</span>
    </div>
  </div>
  <p className="text-2xl font-black text-slate-800">Rp 12.450.000</p>
  <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">✓ Sisa Saldo Riil</span>
</div>
```

### B. Tombol Aksi (Buttons)
1. **Primary Button (Aksi Utama / Simpan)**:
   `bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition flex items-center gap-2 text-xs`
2. **Secondary / Outlined Button**:
   `bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl transition text-xs flex items-center gap-1.5`
3. **Danger Button (Hapus / Batal)**:
   `bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2 px-3 rounded-xl transition text-xs`

### C. Input & Form Fields
- Seluruh input form harus memiliki `rounded-xl`, border `border-slate-200`, latar `bg-slate-50` yang bertransisi ke `focus:bg-white focus:border-emerald-600 focus:outline-none`, dan ukuran teks `text-xs`.
- Berikan hint / teks pendukung berukuran `text-[10px] text-slate-400 mt-1`.

### D. Modal Dialog
- Backdrop: `fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto`.
- Modal Box: `bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[85vh] overflow-y-auto custom-scrollbar`.
- Header modal memiliki judul tegas dengan tombol close lingkaran `w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold`.

### E. Badge & Status Pill
```jsx
// Online / Aktif
<span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
  <span>ONLINE</span>
</span>

// Pending
<span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
  <span>PENDING</span>
</span>
```

---

## 6. Iconography (Material Icons Guide)

Platform menggunakan **Google Material Icons** (`<span className="material-icons">...</span>`). Standarisasi ikon antar fitur:
- **Charity / Donasi**: `volunteer_activism` atau `favorite`
- **Event & Tiket**: `confirmation_number` atau `event`
- **Produk Digital**: `download` atau `inventory_2`
- **E-Course**: `school` atau `play_circle`
- **Store / Toko**: `storefront` atau `shopping_bag`
- **Landing Page**: `web` atau `layers`
- **Jasa / Layanan**: `home_repair_service` atau `handshake`
- **Listener / Webhook**: `phonelink_ring` atau `devices`
- **Uang Masuk**: `arrow_downward` atau `account_balance_wallet`
- **Uang Keluar**: `arrow_upward` atau `payments`
- **DynaQRIS**: `qr_code_2`
- **Transfer Bank**: `account_balance`

---

## 7. Prinsip Desain Terlarang (Strict Don'ts)

1. ❌ **Dilarang mematok nominal preset untuk opsi "Bayar Seikhlasnya"**:
   - Jika suatu layanan bertipe sukarela / bayar seikhlasnya, **JANGAN** membuat tombol preset (`Rp 10.000`, `Rp 25.000`, `Rp 50.000`, dll.). Berikan input bebas mulai dari Rp 0 atau nominal sukarela.
2. ❌ **Dilarang mencampurkan warna primer yang acak**:
   - Jangan gunakan tombol ungu neon, oranye mencolok, atau biru laut secara acak di samping tombol utama. Selalu gunakan turunan `emerald` / `teal` / `slate`.
3. ❌ **Dilarang menggunakan sudut kotak siku-siku (`rounded-none` / `rounded-sm`)**:
   - Seluruh elemen kartu dan kontainer harus rounded (`rounded-2xl` atau `rounded-3xl`).
4. ❌ **Dilarang membuat tabel horizontal yang terpotong tanpa scroll**:
   - Seluruh tabel finansial wajib dibungkus dalam container `overflow-x-auto custom-scrollbar`.
5. ❌ **Dilarang hardcode 1 device lock untuk listener**:
   - Komponen listener harus dirancang mendukung banyak perangkat (*multi-device list*).
