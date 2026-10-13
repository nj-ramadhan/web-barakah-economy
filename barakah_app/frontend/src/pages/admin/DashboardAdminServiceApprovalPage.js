// pages/admin/DashboardAdminServiceApprovalPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminServices, approveService, rejectService } from '../../services/serviceApi';
import { formatCurrency } from '../../utils/formatters';

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const DashboardAdminServiceApprovalPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminList = async (tab) => {
    try {
      setLoading(true);
      const res = await getAdminServices(tab);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setServices(data);
    } catch (err) {
      console.error('Error fetching admin services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login?next=/dashboard/admin/service-approval');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (!user.is_staff && user.role !== 'admin') {
        alert('Halaman ini khusus untuk administrator.');
        navigate('/dashboard');
        return;
      }
    } catch (e) {
      navigate('/dashboard');
      return;
    }

    fetchAdminList(activeTab);
  }, [activeTab, navigate]);

  const handleApprove = async (slug, title) => {
    if (!window.confirm(`Setujui jasa "${title}" agar tayang di katalog publik?`)) return;
    setActionLoading(true);
    try {
      await approveService(slug);
      alert(`Jasa "${title}" berhasil disetujui!`);
      fetchAdminList(activeTab);
    } catch (err) {
      console.error('Error approving service:', err);
      alert('Gagal menyetujui jasa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (item) => {
    setRejectingItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi agar pengguna dapat memperbaiki data.');
      return;
    }

    setActionLoading(true);
    try {
      await rejectService(rejectingItem.slug || rejectingItem.id, rejectReason.trim());
      alert(`Jasa "${rejectingItem.title}" telah ditolak.`);
      setRejectingItem(null);
      fetchAdminList(activeTab);
    } catch (err) {
      console.error('Error rejecting service:', err);
      alert('Gagal menolak jasa.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      <Helmet>
        <title>Persetujuan Produk Jasa (Admin) - Barakah Economy</title>
      </Helmet>

      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-600 font-semibold">Persetujuan Jasa (Admin)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="material-icons text-emerald-600">verified</span>
              <span>Persetujuan Produk Jasa</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjau dan setujui pengajuan layanan jasa profesional dari para anggota dan mitra.
            </p>
          </div>

          <Link
            to="/jasa"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-icons text-base">visibility</span>
            <span>Lihat Katalog Publik</span>
          </Link>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">pending_actions</span>
            <span>Menunggu Persetujuan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'approved'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">check_circle</span>
            <span>Disetujui</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'rejected'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">cancel</span>
            <span>Ditolak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">list_alt</span>
            <span>Semua Jasa</span>
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4"></div>
            <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat data pengajuan...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-6 shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-icons text-3xl">task_alt</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Tidak Ada Data Jasa</h3>
            <p className="text-xs text-slate-500">
              Tidak ada produk jasa pada status ini saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(item => {
              const statusColor =
                item.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : item.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              const statusText =
                item.status === 'approved'
                  ? 'Disetujui'
                  : item.status === 'rejected'
                  ? 'Ditolak'
                  : 'Menunggu Persetujuan';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start justify-between"
                >
                  {/* Foto & Info */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
                    <div className="w-full sm:w-44 h-36 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      <img
                        src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${statusColor}`}>
                          {statusText}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                          {item.category_display || 'Jasa'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Diajukan: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 mb-1.5">
                        {item.title}
                      </h3>

                      {/* Seller Detail */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                        <img
                          src={getMediaUrl(item.seller_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.seller_name)}&background=059669&color=fff`}
                          alt={item.seller_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-800">{item.seller_full_name || item.seller_name}</span>
                        <span className="text-slate-400">(@{item.seller_shop_name || item.seller_name})</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-semibold">WA: {item.whatsapp_number || '-'}</span>
                      </div>

                      {/* Tarif & Kota */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-sm font-extrabold text-emerald-700">
                          {Number(item.price) > 0 ? `Rp ${formatCurrency(item.price)}` : 'Tarif Fleksibel'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {item.price_rate || '/sesi'}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          Lokasi: {item.location_city || 'Semua Wilayah'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.description || 'Tidak ada deskripsi.'}
                      </p>

                      {item.status === 'rejected' && item.rejection_reason && (
                        <p className="text-xs text-rose-600 mt-2 font-medium">
                          <strong>Alasan Ditolak:</strong> {item.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Link
                      to={`/jasa/${item.slug || item.id}`}
                      target="_blank"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1"
                    >
                      <span className="material-icons text-sm">open_in_new</span>
                      <span>Preview</span>
                    </Link>

                    {item.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleApprove(item.slug || item.id, item.title)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-icons text-sm">check_circle</span>
                        <span>Setujui</span>
                      </button>
                    )}

                    {item.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleOpenReject(item)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-icons text-sm">cancel</span>
                        <span>Tolak</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL TOLAK JASA */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900 mb-1 flex items-center gap-2">
              <span className="material-icons text-rose-600">cancel</span>
              <span>Tolak Pengajuan Jasa</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Jasa: <strong>{rejectingItem.title}</strong>
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Foto kurang jelas, nomor WhatsApp tidak aktif, informasi tarif belum lengkap..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none leading-relaxed"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak'}
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

export default DashboardAdminServiceApprovalPage;
