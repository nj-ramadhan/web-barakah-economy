// pages/ServiceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import { getServiceDetail, toggleLikeService } from '../services/serviceApi';
import { formatCurrency } from '../utils/formatters';

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount);
};

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getServiceDetail(slug);
        setService(res.data);
        setIsLiked(res.data.is_liked);
        setLikesCount(res.data.likes_count || 0);
      } catch (err) {
        console.error('Error fetching service detail:', err);
        setError('Layanan jasa tidak ditemukan atau sedang tidak aktif.');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchDetail();
  }, [slug]);

  const handleLike = async () => {
    try {
      const res = await toggleLikeService(slug);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch (err) {
      console.error('Error liking service:', err);
    }
  };

  if (loading) {
    return (
      <div className="body min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-16">
          <div className="w-14 h-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
          <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat rincian jasa...</p>
        </div>
        <NavigationButton />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="body min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto my-16">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <span className="material-icons text-3xl">error_outline</span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Layanan Jasa Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'Jasa ini tidak tersedia atau telah dihapus.'}</p>
          <button
            onClick={() => navigate('/jasa')}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            Lihat Katalog Jasa Lainnya
          </button>
        </div>
        <NavigationButton />
      </div>
    );
  }

  const phone = service.effective_whatsapp;
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const customMessage = service.whatsapp_message || `Halo kak ${service.seller_full_name || service.seller_name}, saya melihat penawaran jasa *${service.title}* di Barakah Economy dan berminat untuk menggunakan jasanya. Boleh info lebih detail?`;
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(customMessage)}` : '#';

  const storeUrl = service.seller_shop_name
    ? `/store/${service.seller_shop_name}`
    : `/store/${service.seller_name}`;

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      <Helmet>
        <title>{service.title} - Layanan Jasa | Barakah Economy</title>
        <meta name="description" content={service.description?.slice(0, 150) || service.title} />
        <meta property="og:title" content={`${service.title} - Barakah Economy`} />
        <meta property="og:description" content={service.description?.slice(0, 150)} />
        <meta property="og:image" content={getMediaUrl(service.thumbnail)} />
      </Helmet>

      <Header />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-5">
          <Link to="/" className="hover:text-slate-600">Beranda</Link>
          <span>/</span>
          <Link to="/jasa" className="hover:text-slate-600">Produk Jasa</Link>
          <span>/</span>
          <span className="text-slate-600 truncate max-w-[200px] sm:max-w-none">{service.title}</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* FOTO JASA */}
            <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-xs">
              <img
                src={getMediaUrl(service.thumbnail) || '/placeholder-image.jpg'}
                alt={service.title}
                className="w-full h-64 sm:h-84 object-cover"
                onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
              />
              <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                {service.category_display || 'Jasa'}
              </div>
            </div>

            {/* DETAIL & SPEC */}
            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                {/* Seller Profile Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <Link to={storeUrl} className="flex items-center gap-2.5 group">
                    <img
                      src={getMediaUrl(service.seller_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(service.seller_shop_name || service.seller_name)}&background=6366f1&color=fff`}
                      alt={service.seller_name}
                      className="w-10 h-10 rounded-full object-cover border border-indigo-100 group-hover:scale-105 transition"
                    />
                    <div>
                      <p className="text-xs text-slate-400">Penyedia Jasa:</p>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {service.seller_full_name || service.seller_shop_name || service.seller_name}
                      </h4>
                      <p className="text-[10px] text-indigo-600 font-semibold">@{service.seller_shop_name || service.seller_name}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLike}
                      className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs transition ${
                        isLiked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-rose-500'
                      }`}
                    >
                      <span className="material-icons text-base">{isLiked ? 'favorite' : 'favorite_border'}</span>
                      <span>{likesCount}</span>
                    </button>
                    <ShareButton
                      slug={`jasa/${service.slug || service.id}`}
                      title={service.title}
                      type="service"
                      description={service.description}
                    />
                  </div>
                </div>

                {/* Judul & Lokasi */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 leading-tight">
                  {service.title}
                </h1>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="material-icons text-sm text-indigo-600">location_on</span>
                    <span>Wilayah: {service.location_city || service.seller_city || 'Seluruh Indonesia'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-icons text-sm text-slate-400">visibility</span>
                    <span>Dilihat: {service.views_count || 0} kali</span>
                  </div>
                </div>

                {/* Tarif Card */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 mb-6">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Tarif / Rate Harga</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                      {Number(service.price) > 0 ? formatIDR(service.price) : 'Tarif Fleksibel / Negosiasi'}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      {service.price_rate || '/sesi'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tarif di atas adalah estimasi / rate resmi dari penyedia. Rincian kebutuhan spesifik dapat didiskusikan langsung via WhatsApp.
                  </p>
                </div>

                {/* Deskripsi */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Deskripsi Layanan</h3>
                  <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    {service.description || 'Tidak ada deskripsi tambahan.'}
                  </div>
                </div>
              </div>

              {/* ACTION: Direct WhatsApp */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-6 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 text-center transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>Pesan / Tanya via WhatsApp</span>
                </a>

                <Link
                  to={storeUrl}
                  className="py-3.5 px-6 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition flex items-center justify-center gap-1.5"
                >
                  <span className="material-icons text-base">storefront</span>
                  <span>Lihat Toko Penyedia</span>
                </Link>
              </div>

            </div>

          </div>
        </div>
      </div>

      <NavigationButton />
    </div>
  );
};

export default ServiceDetailPage;
