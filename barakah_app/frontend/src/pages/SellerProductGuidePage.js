import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const SellerProductGuidePage = () => {
    const [currentPage, setCurrentPage] = useState('flowchart'); // 'flowchart', 1, or 2
    const [activeAccordion, setActiveAccordion] = useState(null);

    const toggleAccordion = (index) => {
        setActiveAccordion(activeAccordion === index ? null : index);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-gray-50 min-h-screen text-gray-800 pb-20 print:bg-white print:pb-0">
            <Helmet>
                <title>Panduan Lengkap Tambah Produk Seller - Barakah Economy</title>
                <meta name="description" content="Panduan resmi langkah demi langkah bagi mitra seller untuk menambahkan dan mengelola produk fisik e-commerce di platform Barakah Economy." />
            </Helmet>

            <Header />

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white py-10 px-4 shadow-md print:hidden">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/60 border border-emerald-400/30 rounded-full text-xs font-semibold tracking-wide text-emerald-200 mb-3">
                                <span className="material-icons text-sm text-emerald-300">verified</span>
                                Panduan Resmi Mitra Seller BAE
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                                Panduan Lengkap Menambahkan Produk E-Commerce
                            </h1>
                            <p className="text-emerald-100 text-sm mt-2 max-w-2xl leading-relaxed">
                                Pelajari alur penambahan produk dari tahap persiapan, pengisian data dasar, pengaturan ongkir flat toko & COD, variasi harga dinamis, hingga pemrosesan pesanan masuk.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                                title="Cetak atau Simpan sebagai PDF"
                            >
                                <span className="material-icons text-sm">print</span>
                                <span>Cetak / PDF</span>
                            </button>
                            <Link
                                to="/dashboard/sinergy/seller"
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black transition shadow-md cursor-pointer"
                            >
                                <span className="material-icons text-sm">storefront</span>
                                <span>Buka Dashboard Seller</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Multi-Page Navigation Tabs */}
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row gap-2 print:hidden">
                    <button
                        onClick={() => { setCurrentPage('flowchart'); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                            currentPage === 'flowchart'
                                ? 'bg-emerald-600 text-white shadow-sm font-black'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                currentPage === 'flowchart' ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                                📊
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-80">Diagram Alur</p>
                                <p className="text-sm">Flowchart Bergambar (1 Lembar Utuh)</p>
                            </div>
                        </div>
                        <span className="material-icons text-sm opacity-60">account_tree</span>
                    </button>

                    <button
                        onClick={() => { setCurrentPage(1); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                            currentPage === 1
                                ? 'bg-emerald-600 text-white shadow-sm font-black'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                currentPage === 1 ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                                1
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-80">Halaman 1</p>
                                <p className="text-sm">Langkah Awal & Formulir Dasar</p>
                            </div>
                        </div>
                        <span className="material-icons text-sm opacity-60">arrow_forward</span>
                    </button>

                    <button
                        onClick={() => { setCurrentPage(2); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                            currentPage === 2
                                ? 'bg-emerald-600 text-white shadow-sm font-black'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                currentPage === 2 ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                                2
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-80">Halaman 2</p>
                                <p className="text-sm">Logistik, Ongkir & Fitur Toko</p>
                            </div>
                        </div>
                        <span className="material-icons text-sm opacity-60">arrow_forward</span>
                    </button>
                </div>

                {/* ========================================================= */}
                {/* TAB FLOWCHART: DIAGRAM ALUR BERGAMBAR (1 GAMBAR UTUH) */}
                {/* ========================================================= */}
                {currentPage === 'flowchart' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                    <span className="material-icons">account_tree</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                                        Diagram Flowchart Alur Tambah Produk Seller (1 Gambar Utuh)
                                    </h3>
                                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                        Alur komprehensif dari Step 01 hingga Step 08 yang merefleksikan seluruh formulir dan fitur toko di aplikasi Barakah Economy.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                <a
                                    href="/images/guide/alur_tambah_produk_seller.svg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    Buka Resolusi Penuh ↗
                                </a>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 text-center">
                            <img
                                src="/images/guide/alur_tambah_produk_seller.svg"
                                alt="Diagram Flowchart Tambah Produk Seller Barakah Economy"
                                className="w-full max-w-4xl mx-auto h-auto rounded-2xl border border-gray-100 shadow-sm"
                            />
                        </div>

                        {/* Flowchart Quick Navigation */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                            <span className="text-xs text-gray-500 font-medium">
                                Ingin membaca penjelasan rincian setiap formulir per halaman?
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setCurrentPage(1); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer"
                                >
                                    Buka Halaman 1
                                </button>
                                <button
                                    onClick={() => { setCurrentPage(2); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                                >
                                    Buka Halaman 2
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* HALAMAN 1: LANGKAH AWAL & FORMULIR DASAR PRODUK */}
                {/* ========================================================= */}
                {currentPage === 1 && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Bar */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                <span className="material-icons">menu_book</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                                    Halaman 1 dari 2: Alur Persiapan & Pengisian Data Pokok
                                </h3>
                                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                    Pada bagian ini, Anda akan memandu diri Anda mulai dari mengakses menu manajemen toko di dashboard, memahami arti setiap kolom formulir (nama, harga beli, harga jual, stok, kategori), hingga menyusun deskripsi produk yang menarik dengan Rich Text Editor.
                                </p>
                            </div>
                        </div>

                        {/* STEP 1 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    01
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Mengakses Dashboard Seller & Tombol "Tambah Produk"
                                    </h2>
                                    <p className="text-xs text-gray-500">Langkah pertama untuk memulai katalog jualan Anda</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                <div className="lg:col-span-7 space-y-3 text-sm text-gray-600 leading-relaxed">
                                    <p>
                                        Untuk menambahkan produk fisik baru ke etalase e-commerce Barakah Economy, pastikan akun Anda telah terdaftar dan login. Kemudian ikuti alur navigasi berikut:
                                    </p>
                                    <ol className="list-decimal list-inside space-y-2 font-medium text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                                        <li>Buka menu <strong>Dashboard</strong> utama pada bilah navigasi atas.</li>
                                        <li>Pilih menu <strong>Sinergy / Seller Produk</strong> (atau akses cepat via <code className="bg-white px-2 py-0.5 border rounded text-emerald-700 font-mono">/dashboard/sinergy/seller</code>).</li>
                                        <li>Pada pojok kanan atas halaman daftar produk, klik tombol hijau bertuliskan <strong>"+ Tambah Produk"</strong>.</li>
                                    </ol>
                                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                                        <span className="material-icons text-amber-600 text-base shrink-0 mt-0.5">lightbulb</span>
                                        <span>
                                            <strong>Tips Seller:</strong> Di samping tombol Tambah Produk, Anda juga dapat memantau badge notifikasi merah bertuliskan angka pesanan yang menunggu diproses (<em>Pesanan Masuk</em>).
                                        </span>
                                    </div>
                                </div>

                                <div className="lg:col-span-5">
                                    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md group relative">
                                        <img
                                            src="/images/guide/seller_guide_step1.jpg"
                                            alt="Dashboard Seller dan Tombol Tambah Produk"
                                            className="w-full h-auto object-cover group-hover:scale-102 transition duration-300"
                                        />
                                        <div className="p-2.5 bg-gray-900 text-white text-[11px] text-center font-medium">
                                            Ilustrasi 1: Tampilan Dashboard Seller & Tombol Tambah Produk
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    02
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Mengisi Informasi Pokok & Identitas Produk
                                    </h2>
                                    <p className="text-xs text-gray-500">Membangun nama produk dan klasifikasi yang tepat</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">title</span>
                                        <span>Nama Produk (Title) *</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Gunakan penamaan yang jelas dan informatif. Format yang dianjurkan: <em>[Jenis Produk] + [Merek / Nama Khusus] + [Spesifikasi / Ukuran]</em>.
                                    </p>
                                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-xs text-emerald-700 font-medium">
                                        Contoh: <strong>Madu Murni Hutan Sumbawa 500ml</strong> atau <strong>Buku Fiqih Muamalah Kontemporer</strong>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">category</span>
                                        <span>Kategori Produk *</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Pilih kategori yang tersedia pada daftar (Buku Islami, Pakaian, Herbal, Sembako, Elektronik, Kuliner) atau ketik langsung kategori khusus produk Anda.
                                    </p>
                                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-xs text-gray-600">
                                        Kategori mempermudah calon pembeli menemukan produk Anda saat menggunakan fitur filter pencarian e-commerce.
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">straighten</span>
                                        <span>Satuan Unit Produk (Unit)</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Tersedia lebih dari 20 satuan unit seperti: <span className="font-semibold text-gray-800">pcs, buku, eksemplar, kg, gram, pack, botol, dus, lusin</span>. Satuan ini akan tertera di samping informasi stok di etalase.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">scale</span>
                                        <span>Berat Produk (Gram) *</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Isikan bobot produk dalam satuan gram (contoh: 1 kg diisi <strong>1000</strong>). Berat ini digunakan oleh modul kalkulator ekspedisi kurir.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* STEP 3 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    03
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Menentukan Harga Beli, Harga Jual & Stok
                                    </h2>
                                    <p className="text-xs text-gray-500">Transparansi dan ketepatan perhitungan margin syariah</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Harga Beli Dasar (HPP)</span>
                                    <h4 className="text-base font-black text-gray-800 mt-1">Harga Modal</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Harga pokok pembelian / produksi per unit. Data ini bersifat privat bagi seller untuk mencatat margin usaha.
                                    </p>
                                </div>

                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Harga Jual Konsumen</span>
                                    <h4 className="text-base font-black text-emerald-900 mt-1">Harga Etalase (Rp)</h4>
                                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                        Nominal yang dibayar pembeli. <em>Catatan: Jika Anda menggunakan Varian, kolom ini otomatis mengambil harga varian terendah.</em>
                                    </p>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Stok Tersedia</span>
                                    <h4 className="text-base font-black text-blue-900 mt-1">Jumlah Fisik</h4>
                                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                                        Jumlah barang siap kirim. Jika Anda mengisi varian di bawahnya, total stok gudang akan terkalkulasi otomatis!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* STEP 4 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    04
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Menyusun Deskripsi Produk dengan Rich Text Editor
                                    </h2>
                                    <p className="text-xs text-gray-500">Gunakan formatting tebal, daftar poin, dan heading untuk memikat pembeli</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                <div className="lg:col-span-6 space-y-3 text-xs text-gray-600 leading-relaxed">
                                    <p>
                                        Formulir produk BAE dilengkapi dengan <strong>CKEditor (Rich Text)</strong>. Anda dapat membuat deskripsi profesional tanpa perlu menulis kode HTML secara manual:
                                    </p>
                                    <ul className="space-y-1.5 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-700">
                                        <li className="flex items-center gap-2">
                                            <span className="material-icons text-emerald-600 text-sm">format_bold</span>
                                            <span><strong>Tebal (Bold)</strong>: sorot poin kunci atau spesifikasi utama.</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-icons text-emerald-600 text-sm">format_list_bulleted</span>
                                            <span><strong>Daftar Poin (Bullets)</strong>: rincikan manfaat, kandungan, atau isi paket.</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-icons text-emerald-600 text-sm">title</span>
                                            <span><strong>Heading (Judul Bagian)</strong>: pisahkan bab deskripsi agar mudah dibaca di layar HP.</span>
                                        </li>
                                    </ul>
                                    <p className="text-gray-500">
                                        Tersedia pula kolom tambahan: <strong>Informasi Pengambilan / Teknis (Opsional)</strong> jika barang memiliki petunjuk khusus (misal lokasi ambil langsung di toko/gudang).
                                    </p>
                                </div>

                                <div className="lg:col-span-6">
                                    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md group relative">
                                        <img
                                            src="/images/guide/seller_guide_step2.jpg"
                                            alt="Formulir Tambah Produk dan Rich Text Editor"
                                            className="w-full h-auto object-cover group-hover:scale-102 transition duration-300"
                                        />
                                        <div className="p-2.5 bg-gray-900 text-white text-[11px] text-center font-medium">
                                            Ilustrasi 2: Tampilan Formulir Data Produk & Rich Text Editor
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Page 1 Bottom Navigation Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                            <span className="text-xs text-gray-500 font-medium">
                                Menampilkan Halaman 1 dari 2 (Langkah Pokok)
                            </span>
                            <button
                                onClick={() => { setCurrentPage(2); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                                <span>Lanjut ke Halaman 2: Ongkir, Varian & Fitur Toko</span>
                                <span className="material-icons text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ========================================================= */}
                {/* HALAMAN 2: PENGATURAN LANJUTAN, ONGKIR, VARIAN & TOKO */}
                {/* ========================================================= */}
                {currentPage === 2 && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Bar */}
                        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                <span className="material-icons">tune</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-teal-950 uppercase tracking-wide">
                                    Halaman 2 dari 2: Pengaturan Ongkir, Galeri, Varian Dinamis & Pasca-Tayang
                                </h3>
                                <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                                    Pelajari fitur-fitur mutakhir yang meningkatkan kepuasan pembeli: tarif ongkos kirim flat toko (tanpa kelipatan), tombol COD, unggah galeri foto carousel, varian dinamis otomatis, hingga fitur manajemen kupon voucher.
                                </p>
                            </div>
                        </div>

                        {/* STEP 5 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    05
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Sistem Pengiriman, COD & Ongkir Flat Toko
                                    </h2>
                                    <p className="text-xs text-gray-500">Atur kebijakan pengiriman fleksibel yang ramah pembeli</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                <div className="lg:col-span-7 space-y-4 text-xs text-gray-600 leading-relaxed">
                                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-emerald-700 text-lg">local_shipping</span>
                                            <h4 className="text-sm font-black text-emerald-900">Fitur: Tarif Ongkir Flat Toko</h4>
                                        </div>
                                        <p>
                                            Jika tombol switch diaktifkan, Anda dapat memasukkan nominal tarif kirim seragam (contoh: <strong className="text-emerald-800">Rp 10.000</strong>).
                                        </p>
                                        <div className="bg-white p-3 rounded-xl border border-emerald-300 text-gray-700">
                                            <span className="font-bold text-emerald-800">Prinsip Tanpa Kelipatan:</span>
                                            <p className="mt-0.5">
                                                Jika seorang pembeli memesan 2, 3, atau 5 produk berbeda dari toko Anda sekaligus, pembeli <strong>hanya membayar 1x ongkos kirim</strong>. Hal ini memacu pembeli untuk memborong banyak barang di toko Anda!
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-blue-700 text-lg">payments</span>
                                            <h4 className="text-sm font-black text-blue-900">Fitur: Aktifkan COD (Bayar di Tempat)</h4>
                                        </div>
                                        <p>
                                            Aktifkan sakelar COD jika Anda menyediakan layanan bayar langsung saat kurir/ekspedisi mengantarkan pesanan ke rumah pembeli.
                                        </p>
                                    </div>
                                </div>

                                <div className="lg:col-span-5">
                                    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md group relative">
                                        <img
                                            src="/images/guide/seller_guide_step3.jpg"
                                            alt="Pengaturan Ongkir Flat Toko, COD dan Varian"
                                            className="w-full h-auto object-cover group-hover:scale-102 transition duration-300"
                                        />
                                        <div className="p-2.5 bg-gray-900 text-white text-[11px] text-center font-medium">
                                            Ilustrasi 3: Panel Pengaturan Ongkir Flat, COD, Foto & Varian
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 6 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    06
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Unggah Foto Utama (Thumbnail) & Galeri Carousel
                                    </h2>
                                    <p className="text-xs text-gray-500">Tampilkan visual barang dagangan yang jernih dan beresolusi tajam</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">photo_camera</span>
                                        <span>Foto Utama (Thumbnail) *</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Foto yang akan tampil di etalase kartu produk depan. Gunakan rasio 1:1 (persegi) atau orientasi vertikal dengan latar belakang bersih dan pencahayaan terang.
                                    </p>
                                    <span className="inline-block text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">Format: .jpg / .jpeg</span>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                        <span className="material-icons text-base">collections</span>
                                        <span>Galeri Foto Tambahan (Hingga 5 Foto)</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Unggah beberapa foto sekaligus untuk memperlihatkan sudut pandang produk (tampak depan, belakang, label komposisi, buku isi halaman, dsb). Foto akan otomatis tampil dalam bentuk carousel geser di halaman detail produk.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* STEP 7 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    07
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Fitur Varian Produk Dinamis (Ukuran / Warna / Rasa)
                                    </h2>
                                    <p className="text-xs text-gray-500">Harga dan stok varian yang tersinkronisasi otomatis</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
                                <p>
                                    Jika produk memiliki opsi pilihan (misal: Ukuran <em>S, M, L, XL</em> atau Rasa <em>Original, Pedas</em>), Anda tidak perlu membuat produk baru secara terpisah. Cukup gunakan tabel <strong>Varian Produk</strong>:
                                </p>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse border border-gray-200 rounded-xl overflow-hidden">
                                        <thead className="bg-emerald-50 text-emerald-900 font-bold">
                                            <tr>
                                                <th className="p-3 border border-emerald-200">Kolom Input</th>
                                                <th className="p-3 border border-emerald-200">Contoh Isi</th>
                                                <th className="p-3 border border-emerald-200">Cara Kerja Sistem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            <tr>
                                                <td className="p-3 font-bold text-gray-800">Nama Varian</td>
                                                <td className="p-3 text-emerald-700">XL / Merah Marun</td>
                                                <td className="p-3 text-gray-600">Muncul sebagai tombol pill yang dapat diklik pembeli sebelum checkout.</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-gray-800">Harga Varian (Rp)</td>
                                                <td className="p-3 text-emerald-700">Rp 160.000</td>
                                                <td className="p-3 text-gray-600"><strong>Harga Total</strong> yang dibayar pembeli jika memilih varian ini (menggantikan harga dasar).</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-bold text-gray-800">Stok Varian</td>
                                                <td className="p-3 text-emerald-700">25 pcs</td>
                                                <td className="p-3 text-gray-600">Mengontrol ketersediaan varian tersebut dan otomatis menjumlahkan total stok gudang.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                                    <span className="material-icons text-emerald-700 text-base shrink-0 mt-0.5">check_circle</span>
                                    <span>
                                        Klik tombol <strong>"+ Varian"</strong> untuk menambah baris pilihan sebanyak yang dibutuhkan, atau klik ikon tong sampah merah untuk menghapusnya.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* STEP 8 */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                                    08
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">
                                        Simpan Produk & Fitur Pasca-Tayang
                                    </h2>
                                    <p className="text-xs text-gray-500">Langkah terakhir dan pengelolaan etalase selanjutnya</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-between shadow-md">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons text-2xl">save</span>
                                        <div>
                                            <h4 className="font-black text-sm">Klik Tombol "Simpan Produk"</h4>
                                            <p className="text-xs text-emerald-100">Produk akan langsung tersimpan dan otomatis tayang di etalase e-commerce publik!</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
                                        <div className="flex items-center gap-1.5 text-purple-800 font-bold text-xs">
                                            <span className="material-icons text-sm">campaign</span>
                                            <span>Fitur Promo & Diskon</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600">
                                            Pada kartu produk, klik tombol ungu <strong>Promo</strong> untuk memasang diskon harga coret sementara waktu.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 space-y-1">
                                        <div className="flex items-center gap-1.5 text-orange-800 font-bold text-xs">
                                            <span className="material-icons text-sm">local_activity</span>
                                            <span>Fitur Voucher Toko</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600">
                                            Buat kupon diskon dengan kode khusus (misal: <em>BAE2025</em>) dan batasan kuota untuk menarik pelanggan setia Anda.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                                            <span className="material-icons text-sm">swap_horiz</span>
                                            <span>Pindah Kepemilikan</span>
                                        </div>
                                        <p className="text-[11px] text-gray-600">
                                            Klik tombol panah tukar kuning untuk mengalihkan kepemilikan produk ke akun mitra/rekan seller lainnya secara aman.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Page 2 Bottom Navigation Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                            <button
                                onClick={() => { setCurrentPage(1); window.scrollTo({ top: 150, behavior: 'smooth' }); }}
                                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span className="material-icons text-sm">arrow_back</span>
                                <span>Kembali ke Halaman 1</span>
                            </button>

                            <Link
                                to="/dashboard/sinergy/seller"
                                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                                <span className="material-icons text-sm">add_circle</span>
                                <span>Mulai Tambah Produk di Dashboard Sekarang 🚀</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* FAQ / Pertanyaan Umum Seller Section (Always Visible on Both Pages) */}
                <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-icons text-emerald-600">help_outline</span>
                        <h3 className="text-base font-black text-gray-900">Pertanyaan Umum (FAQ) Seputar Produk Seller</h3>
                    </div>

                    <div className="space-y-3">
                        {[
                            {
                                q: 'Apakah produk yang saya tambahkan langsung tayang di katalog publik?',
                                a: 'Ya! Produk yang Anda simpan langsung aktif dan tayang di etalase e-commerce BAE tanpa perlu menunggu persetujuan admin.'
                            },
                            {
                                q: 'Bagaimana cara kerja Ongkir Flat Toko jika pembeli membeli produk berbeda?',
                                a: 'Jika pembeli membeli lebih dari 1 produk di toko Anda dalam satu keranjang, ongkos kirim disamakan mengikuti tarif flat toko Anda (tidak berlipat ganda), sehingga jauh lebih hemat dan menguntungkan pelanggan Anda.'
                            },
                            {
                                q: 'Apakah saya bisa mengubah harga atau stok setelah produk tayang?',
                                a: 'Tentu saja. Anda dapat mengklik tombol "Edit" pada kartu produk di dashboard kapan saja untuk memperbarui stok, foto, deskripsi, maupun harga varian.'
                            },
                            {
                                q: 'Bagaimana jika stok produk saya habis?',
                                a: 'Sistem e-commerce BAE secara cerdas akan menandai produk Anda sebagai "Stok Habis" dan mencegah checkout berlebih sampai Anda menambah kembali angka stok di dashboard seller.'
                            }
                        ].map((faq, index) => (
                            <div key={index} className="border border-gray-200/80 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => toggleAccordion(index)}
                                    className="w-full p-4 text-left font-bold text-xs text-gray-800 flex justify-between items-center hover:bg-gray-50 transition cursor-pointer"
                                >
                                    <span>{faq.q}</span>
                                    <span className="material-icons text-sm text-gray-400">
                                        {activeAccordion === index ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>
                                {activeAccordion === index && (
                                    <div className="px-4 pb-4 text-xs text-gray-600 bg-gray-50/50 leading-relaxed border-t border-gray-100 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerProductGuidePage;
