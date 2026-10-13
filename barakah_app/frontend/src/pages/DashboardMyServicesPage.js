// pages/DashboardMyServicesPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyServices, createService, updateService, deleteService } from '../services/serviceApi';
import { formatCurrency } from '../utils/formatters';

const CATEGORIES = [
  { value: 'elektronik_it', label: 'Elektronik & IT' },
  { value: 'desain_kreatif', label: 'Desain & Kreatif' },
  { value: 'rumah_tukang', label: 'Pertukangan & Rumah Tangga' },
  { value: 'pendidikan_kursus', label: 'Pendidikan & Kursus / Les' },
  { value: 'kesehatan_terapi', label: 'Kesehatan & Terapi' },
  { value: 'bisnis_legal', label: 'Bisnis, Keuangan & Legal' },
  { value: 'transportasi_logistik', label: 'Transportasi & Logistik' },
  { value: 'acara_fotografi', label: 'Acara & Fotografi' },
  { value: 'kebersihan_laundry', label: 'Kebersihan & Laundry' },
  { value: 'otomotif', label: 'Servis Otomotif' },
  { value: 'kuliner_katering', label: 'Katering & Jasa Kuliner' },
  { value: 'lainnya', label: 'Layanan Lainnya' },
];

const RATE_OPTIONS = [
  '/jam',
  '/hari',
  '/proyek',
  '/sesi',
  '/orang',
  '/meter',
  '/m2',
  '/kunjungan',
  '/bulan',
  'Mulai dari',
  'Negosiasi / Sesuai Kesepakatan',
];

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const DashboardMyServicesPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'elektronik_it',
    price: '',
    price_rate: '/jam',
    whatsapp_number: '',
    whatsapp_message: '',
    location_city: '',
    description: '',
    thumbnail: null,
  });

  const [previewThumbnail, setPreviewThumbnail] = useState(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getMyServices();
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setServices(data);
    } catch (err) {
      console.error('Error fetching my services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login?next=/dashboard/services');
      return;
    }
    fetchList();
  }, [navigate]);

  const handleOpenAdd = () => {
    const userStr = localStorage.getItem('user');
    let defaultPhone = '';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        defaultPhone = u.phone_number || u.phone || u.whatsapp || '';
      } catch (e) {}
    }

    setEditingItem(null);
    setFormData({
      title: '',
      category: 'elektronik_it',
      price: '',
      price_rate: '/jam',
      whatsapp_number: defaultPhone,
      whatsapp_message: '',
      location_city: '',
      description: '',
      thumbnail: null,
    });
    setPreviewThumbnail(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'elektronik_it',
      price: item.price || '',
      price_rate: item.price_rate || '/jam',
      whatsapp_number: item.whatsapp_number || '',
      whatsapp_message: item.whatsapp_message || '',
      location_city: item.location_city || '',
      description: item.description || '',
      thumbnail: null,
    });
    setPreviewThumbnail(item.thumbnail ? getMediaUrl(item.thumbnail) : null);
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, thumbnail: file }));
      setPreviewThumbnail(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Judul jasa wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title.trim());
      fd.append('category', formData.category);
      fd.append('price', formData.price || '0');
      fd.append('price_rate', formData.price_rate);
      fd.append('whatsapp_number', formData.whatsapp_number.trim());
      fd.append('whatsapp_message', formData.whatsapp_message.trim());
      fd.append('location_city', formData.location_city.trim());
      fd.append('description', formData.description.trim());
      if (formData.thumbnail) {
        fd.append('thumbnail', formData.thumbnail);
      }

      if (editingItem) {
        await updateService(editingItem.slug || editingItem.id, fd);
        alert('Produk jasa berhasil diperbarui!');
      } else {
        await createService(fd);
        alert('Produk jasa berhasil diajukan! Menunggu persetujuan admin sebelum tayang.');
      }

      setShowModal(false);
      fetchList();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Gagal menyimpan produk jasa. Pastikan semua data valid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug, title) => {
    if (!window.confirm(`Yakin ingin menghapus jasa "${title}"?`)) return;
    try {
      await deleteService(slug);
      setServices(prev => prev.filter(s => s.slug !== slug && s.id !== slug));
      alert('Jasa berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting service:', err);
      alert('Gagal menghapus jasa.');
    }
  };

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      <Helmet>
        <title>Kelola Produk Jasa Saya - Barakah Economy</title>
      </Helmet>

      <Header />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-600 font-semibold">Produk Jasa Saya</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Kelola Produk Jasa
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tawarkan keahlian dan jasa Anda. Setiap jasa baru akan diverifikasi oleh admin sebelum tayang di katalog.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/jasa"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <span className="material-icons text-base">visibility</span>
              <span>Lihat Katalog Jasa</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-icons text-base">add</span>
              <span>Tambah Jasa Baru</span>
            </button>
          </div>
        </div>

        {/* LIST JASA USER */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4"></div>
            <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat jasa Anda...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center my-6 shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-icons text-3xl">handyman</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Belum Ada Jasa yang Ditambahkan</h3>
            <p className="text-xs text-slate-500 mb-6">
              Mulai tawarkan keahlian atau jasa profesional Anda untuk menjangkau pelanggan baru di Barakah Economy.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 transition"
            >
              + Tambah Jasa Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(item => {
              const statusColor =
                item.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : item.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              const statusLabel =
                item.status === 'approved'
                  ? 'Disetujui / Tayang'
                  : item.status === 'rejected'
                  ? 'Ditolak'
                  : 'Menunggu Persetujuan Admin';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail & Status Badge */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      <img
                        src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                      />
                      <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold shadow-xs flex items-center gap-1 ${statusColor}`}>
                        <span className="material-icons text-[12px]">
                          {item.status === 'approved' ? 'check_circle' : item.status === 'rejected' ? 'cancel' : 'pending'}
                        </span>
                        <span>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Category & City */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-emerald-700">{item.category_display || 'Jasa'}</span>
                        <span>{item.location_city || 'Semua Wilayah'}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-2">
                        {item.title}
                      </h3>

                      {/* Price Rate */}
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-base font-extrabold text-emerald-700">
                          {Number(item.price) > 0 ? `Rp ${formatCurrency(item.price)}` : 'Tarif Fleksibel'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {item.price_rate || '/sesi'}
                        </span>
                      </div>

                      {/* WhatsApp Target */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                        <span className="material-icons text-sm text-emerald-600">call</span>
                        <span>WA: {item.whatsapp_number || '-'}</span>
                      </div>

                      {/* Rejection notice if rejected */}
                      {item.status === 'rejected' && item.rejection_reason && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-700 mb-2">
                          <strong>Alasan Penolakan:</strong> {item.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/jasa/${item.slug || item.id}`}
                      className="p-2 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-200/60 transition"
                      title="Lihat Halaman Jasa"
                    >
                      <span className="material-icons text-lg">visibility</span>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <span className="material-icons text-sm">edit</span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.slug || item.id, item.title)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Jasa"
                      >
                        <span className="material-icons text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL FORM TAMBAH / EDIT JASA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-100 my-auto">
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600">
                  {editingItem ? 'edit_note' : 'add_circle'}
                </span>
                <span>{editingItem ? 'Edit Produk Jasa' : 'Tambah Produk Jasa Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Judul Jasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama / Judul Jasa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Servis AC & Cuci AC Rumah, Desain Logo & Branding, dsb"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Kategori Jasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Jasa <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Tarif Harga & Satuan Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarif Harga (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (jika negosiasi)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Isi 0 jika tarif negosiasi</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan Rate Tarif
                  </label>
                  <select
                    value={formData.price_rate}
                    onChange={(e) => setFormData({ ...formData, price_rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none cursor-pointer"
                  >
                    {RATE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nomor WhatsApp & Kota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Order <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081234567890"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kota / Wilayah Layanan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta Selatan, Surabaya, Online"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Template Pesan WhatsApp Kustom (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Pembuka Pesan WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Halo, saya tertarik dengan jasa Anda..."
                  value={formData.whatsapp_message}
                  onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              {/* Foto Thumbnail Jasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foto / Banner Jasa
                </label>
                {previewThumbnail && (
                  <div className="mb-2 relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={previewThumbnail} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Deskripsi Jasa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Lengkap Jasa
                </label>
                <textarea
                  rows={4}
                  placeholder="Jelaskan ruang lingkup jasa, portfolio, keunggulan, garansi, atau syarat pemesanan..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none leading-relaxed"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Ajukan Jasa')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      <NavigationButton />
    </div>
  );
};

export default DashboardMyServicesPage;
