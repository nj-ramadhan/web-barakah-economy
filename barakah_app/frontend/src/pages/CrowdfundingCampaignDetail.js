// pages/CrowdfundingCampaignDetail.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import { toggleLikeCampaign } from '../services/campaigns';
import { parseSafeDate, formatSafeDate, isDateExpired } from '../utils/dateUtils';
import '../styles/Body.css';

const getTimeElapsed = (createdAt) => {
  const createdDate = parseSafeDate(createdAt);
  if (!createdDate) return '-';
  const now = new Date();
  const timeDifference = now - createdDate;

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} hari lalu`;
  } else if (hours > 0) {
    return `${hours} jam lalu`;
  } else if (minutes > 0) {
    return `${minutes} menit lalu`;
  } else {
    return `${Math.max(0, seconds)} detik lalu`;
  }
};

const formatIDR = (amount) => {
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatIDRTarget = (amount) => {
  if (amount <= 0) return '\u221E';
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const isCampaignExpired = (deadline) => {
  if (!deadline) return false;
  return isDateExpired(deadline);
};

const formatDeadline = (deadline) => {
  if (!deadline) return 'tidak ada';
  return formatSafeDate(deadline, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }, 'tidak ada');
};


const getButtonLabel = (title = '', isWaqaf = false) => {
  if (isWaqaf) return 'WAKAF / DONASI SEKARANG';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('infak')) return 'INFAK SEKARANG';
  if (lowerTitle.includes('sedekah')) return 'SEDEKAH SEKARANG';
  if (lowerTitle.includes('zakat')) return 'ZAKAT SEKARANG';
  return 'DONASI SEKARANG';
};

const CrowdfundingCampaignDetail = () => {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullUpdates, setShowFullUpdates] = useState({});
  const [realizations, setRealizations] = useState([]);
  const [canViewRealizations, setCanViewRealizations] = useState(false);
  const [loadingRealizations, setLoadingRealizations] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        const campaignResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/${slug}/`);
        setCampaign(campaignResponse.data);
        setIsLiked(campaignResponse.data.is_liked);
        setLikesCount(campaignResponse.data.likes_count);

        const donationsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/donations/campaign/${slug}/donations/`);
        setDonations(donationsResponse.data);
      } catch (err) {
        console.error('Error fetching campaign details:', err);
        setError('Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignDetails();
  }, [slug]);

  useEffect(() => {
    const fetchRealizations = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || activeTab !== 'realization') return;

      setLoadingRealizations(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/realizations/`, {
          params: { campaign_slug: slug },
          headers: { Authorization: `Bearer ${user.access}` }
        });
        setRealizations(response.data);
        setCanViewRealizations(true);
      } catch (err) {
        console.error('Error fetching realizations:', err);
        setCanViewRealizations(false);
      } finally {
        setLoadingRealizations(false);
      }
    };

    fetchRealizations();
  }, [slug, activeTab]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!campaign) {
    return <div className="text-center py-8">Campaign not found.</div>;
  }

  const isExpired = isCampaignExpired(campaign.deadline);
  const deadlineText = formatDeadline(campaign.deadline);

  const handleToggleLike = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert('Anda harus login terlebih dahulu untuk memberikan like.');
      return;
    }

    setLiking(true);
    // Optimistic UI
    const prevIsLiked = isLiked;
    const prevLikesCount = likesCount;
    setIsLiked(!prevIsLiked);
    setLikesCount(prevLikesCount + (prevIsLiked ? -1 : 1));

    try {
      const res = await toggleLikeCampaign(slug);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Rollback
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
    } finally {
      setLiking(false);
    }
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const toggleUpdate = (updateId) => {
    setShowFullUpdates((prev) => ({
      ...prev,
      [updateId]: !prev[updateId],
    }));
  };

  const convertRelativeUrlsToAbsolute = (htmlContent, baseUrl) => {
    // Ensure baseUrl does not have a trailing slash
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    // Convert relative image URLs to absolute URLs
    return htmlContent.replace(/<img[^>]+src="(\/[^"]+)"[^>]*>/g, (match, src) => {
      return match.replace(src, `${baseUrl}${src}`);
    });
  };

  return (
    <div className="body">
      <Helmet>
        <title>{campaign.title} | BARAKAH ECONOMY</title>
        <meta name="description" content={campaign.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:title" content={campaign.title} />
        <meta property="og:description" content={campaign.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:image" content={campaign.thumbnail} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": campaign.title,
            "description": campaign.description?.replace(/<[^>]+>/g, '').slice(0, 200),
            "image": campaign.thumbnail,
            "brand": {
              "@type": "Brand",
              "name": "Barakah Economy Charity"
            },
            "offers": {
              "@type": "Offer",
              "availability": isCampaignExpired(campaign.deadline) ? "https://schema.org/Discontinued" : "https://schema.org/InStock",
              "price": "0",
              "priceCurrency": "IDR"
            }
          })}
        </script>
      </Helmet>

      <Header />
      {/* Campaign Details */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col md:flex-row">
          {/* Campaign Thumbnail Container with Cinematic Blurred Background */}
          <div className="relative w-full md:w-1/2 overflow-hidden bg-slate-950 flex items-center justify-center self-stretch min-h-[300px] md:min-h-0">
            {/* Cinematic Blurred Background for Letterboxing / Pillarboxing */}
            <img
              src={campaign.thumbnail || '/placeholder-image.jpg'}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-60 brightness-75 select-none pointer-events-none"
              style={{ filter: 'blur(24px) brightness(0.75)', transform: 'scale(1.25)' }}
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
            {/* Ambient Overlay */}
            <div className="absolute inset-0 bg-black/20 select-none pointer-events-none" />

            {/* Sharp Full Foreground Image */}
            <img
              src={campaign.thumbnail || '/placeholder-image.jpg'}
              alt={campaign.title}
              className="relative z-10 w-full h-72 sm:h-80 md:h-full object-contain drop-shadow-xl select-none"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
          </div>
          <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">{campaign.title}</h1>
              <div className="flex justify-between items-center mb-1">
                <span className="text-lg font-semibold text-green-700">
                  Terkumpul: {campaign.current_amount ? formatIDR(campaign.current_amount) : 'Rp. 0'}
                </span>
                <span className="text-sm text-gray-500">
                  Target: {campaign.target_amount ? formatIDRTarget(campaign.target_amount) : 'Rp. 0'}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-orange-600">
                  Realisasi: {campaign.total_realization ? formatIDR(campaign.total_realization) : 'Rp. 0'}
                  {campaign.current_amount > 0 && (
                    <span className="ml-1 text-xs text-orange-500">
                      ({Math.round((campaign.total_realization / campaign.current_amount) * 100)}%)
                    </span>
                  )}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full shadow-sm"
                    style={{
                      width: `${campaign.current_amount && campaign.target_amount
                        ? Math.min((campaign.current_amount / campaign.target_amount) * 100, 100)
                        : 0}%`,
                    }}
                  ></div>
                </div>
                <div className="text-right text-sm font-medium text-gray-600 mt-2">
                  {campaign.target_amount > 0
                    ? Math.round((campaign.current_amount / campaign.target_amount) * 100)
                    : 0} % tercapai
                </div>
              </div>

              {/* Deadline */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <span className="material-icons text-sm">schedule</span>
                  Batas waktu: {deadlineText}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <span className="material-icons text-[18px]">visibility</span>
                  <span>{campaign.view_count || 0} orang telah melihat</span>
                </div>
              </div>

              {/* Waqaf Collaboration Showcase */}
              {campaign.is_collaboration && campaign.collaboration_type === 'waqaf' && campaign.collab_products_details?.length > 0 && (
                <div className="mb-6 p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-teal-700 text-lg">inventory_2</span>
                      <span className="text-xs font-black text-teal-900 uppercase tracking-wider">
                        Program Kolaborasi Waqaf Produk Store
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                      {campaign.collab_products_details.length} Produk Tersedia
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Anda dapat berdonasi tunai atau memilih untuk <b>mewakafkan langsung produk store</b> di bawah ini:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {campaign.collab_products_details.map(cp => (
                      <div key={cp.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-teal-100 shadow-2xs">
                        {cp.thumbnail ? (
                          <img src={cp.thumbnail} alt="" className="w-11 h-11 object-cover rounded-lg shrink-0" />
                        ) : (
                          <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <span className="material-icons text-gray-400">image</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-gray-900 truncate">{cp.title}</p>
                            {cp.has_campaign && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                {cp.campaign_title || 'Harga Kampanye'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                            <p className="text-[11px] font-black text-teal-700">Rp {Number(cp.price).toLocaleString('id-ID')} / {cp.unit || 'unit'}</p>
                            {cp.original_price && Number(cp.original_price) > Number(cp.price) && (
                              <p className="text-[10px] text-gray-400 line-through">Rp {Number(cp.original_price).toLocaleString('id-ID')}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">Stok: {cp.stock} {cp.unit || 'pcs'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Message */}
              {isExpired && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                  <span className="material-icons text-sm">error_outline</span>
                  Charity ini telah berakhir.
                </div>
              )}
            </div>

            <div className="flex gap-3 items-center">
              <div className="flex-1">
                {isExpired ? (
                  <button
                    className="w-full bg-gray-300 text-white py-3 rounded-xl font-bold cursor-not-allowed"
                    disabled
                  >
                    {getButtonLabel(campaign.title, campaign.is_collaboration && campaign.collaboration_type === 'waqaf')}
                  </button>
                ) : (
                  <Link
                    to={`/bayar-donasi/${campaign.slug}`}
                    className="block text-center bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition shadow-md"
                  >
                    {getButtonLabel(campaign.title, campaign.is_collaboration && campaign.collaboration_type === 'waqaf')}
                  </Link>
                )}
              </div>
              <button 
                onClick={handleToggleLike}
                disabled={liking}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-xl transition-all active:scale-90 shadow-sm border ${isLiked ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
              >
                <span className={`material-icons text-[20px] ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                  {isLiked ? 'favorite' : 'favorite_border'}
                </span>
                <span className="text-sm font-bold">{likesCount}</span>
              </button>
              <ShareButton slug={campaign.slug} title={campaign.title} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 px-4 max-w-6xl mx-auto pb-20">
        <div className="flex justify-start gap-2 md:gap-8 bg-white border-b px-4 md:px-6 flex-wrap">
          <button
            className={`py-2 px-3 md:px-4 text-xs md:text-sm font-medium ${activeTab === 'description' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('description')}
          >
            Keterangan
          </button>
          <button
            className={`py-2 px-3 md:px-4 text-xs md:text-sm font-medium ${activeTab === 'donations' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('donations')}
          >
            Donatur ({donations.length})
          </button>
          <button
            className={`py-2 px-3 md:px-4 text-xs md:text-sm font-medium ${activeTab === 'updates' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('updates')}
          >
            Kabar Terbaru ({campaign.updates ? campaign.updates.length : 0})
          </button>
          <button
            className={`py-2 px-3 md:px-4 text-xs md:text-sm font-medium ${activeTab === 'realization' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('realization')}
          >
            Realisasi
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'description' && (
            <div className="bg-white p-4 rounded-lg shadow">
              {campaign.description ? (
                <>
                  <div
                    onClick={toggleDescription}
                    dangerouslySetInnerHTML={{
                      __html: showFullDescription
                        ? convertRelativeUrlsToAbsolute(campaign.description, baseUrl)
                        : convertRelativeUrlsToAbsolute(campaign.description, baseUrl).substring(0, 200) + '...',
                    }}
                  />
                  {campaign.description.length > 200 && (
                    <button
                      onClick={toggleDescription}
                      className="text-green-600 mt-2 text-sm"
                    >
                      {showFullDescription ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Tidak ada deskripsi.</p>
              )}
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <ul>
                {donations.length > 0 ? (
                  donations.map((donation, index) => {
                    const isWaqaf = donation.donation_type === 'waqaf' || (donation.waqaf_items && donation.waqaf_items.length > 0);
                    const isAnonymous = !isWaqaf && (donation.is_anonymous || donation.donor_name === 'Hamba Allah');
                    const displayName = isAnonymous ? 'Hamba Allah' : (donation.donor_name || 'Hamba Allah');
                    return (
                      <li key={index} className="border-b border-gray-100 py-3.5 px-3 first:pt-1 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold text-sm ${isAnonymous ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                                {displayName}
                              </p>
                              {isWaqaf && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                                  <span className="material-icons text-[11px]">inventory_2</span>
                                  Waqaf Produk
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-black text-emerald-700 mt-0.5">
                              {formatIDR(donation.amount)}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(donation.transfer_date || donation.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })} • {getTimeElapsed(donation.transfer_date || donation.created_at)}
                          </p>
                        </div>

                        {/* Rincian Produk yang diwakafkan */}
                        {isWaqaf && donation.waqaf_items && donation.waqaf_items.length > 0 && (
                          <div className="mt-2.5 p-2.5 bg-teal-50/50 rounded-xl border border-teal-100 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                              <span className="material-icons text-[13px] text-teal-700">card_giftcard</span>
                              Diwakafkan:
                            </span>
                            {donation.waqaf_items.map((it, idx) => (
                              <span key={idx} className="text-[11px] font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">
                                {it.quantity}x {it.product_title}
                              </span>
                            ))}
                          </div>
                        )}

                        {donation.message && (
                          <p className="text-xs text-gray-600 italic mt-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                            💬 "{donation.message}"
                          </p>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="py-8 text-center text-gray-400 text-sm">Belum ada donasi atau waqaf yang terverifikasi.</li>
                )}
              </ul>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="bg-white p-4 rounded-lg shadow">
              <ul>
                {campaign.updates && campaign.updates.length > 0 ? (
                  campaign.updates.map((update) => (
                    <li key={update.id} className="border-b py-2 px-4">
                      <div
                        onClick={() => toggleUpdate(update.id)}
                        className="flex justify-between items-center mb-2">
                        <p className="text-gray-700">
                          <strong>{update.title}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(update.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })} - {getTimeElapsed(update.created_at)}
                        </p>
                      </div>
                      {update.description ? (
                        <>
                          <div
                            onClick={() => toggleUpdate(update.id)}
                            dangerouslySetInnerHTML={{
                              __html: showFullUpdates[update.id]
                                ? convertRelativeUrlsToAbsolute(update.description, baseUrl)
                                : convertRelativeUrlsToAbsolute(update.description, baseUrl).substring(0, 0) + '',
                            }}
                          />
                          {update.description.length > 0 && (
                            <button
                              onClick={() => toggleUpdate(update.id)}
                              className="text-green-600 mt-2 text-sm"
                            >
                              {showFullUpdates[update.id] ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">Tidak ada konten.</p>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">Belum ada kabar terbaru.</p>
                )}
              </ul>
            </div>
          )}
          {activeTab === 'realization' && (
            <div className="bg-white p-4 rounded-lg shadow">
              {loadingRealizations ? (
                <div className="text-center py-4">Memuat data realisasi...</div>
              ) : !canViewRealizations ? (
                <div className="text-center py-8">
                  <span className="material-icons text-4xl text-gray-300 mb-2">lock</span>
                  <p className="text-gray-500">Tab realisasi hanya dapat diakses oleh donatur yang telah berdonasi ke charity ini.</p>
                  {!localStorage.getItem('user') && (
                    <Link to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="text-green-600 font-bold mt-2 inline-block">Login sekarang</Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left flex-1">
                      <p className="text-sm text-green-700 font-medium mb-1">Total Terkumpul</p>
                      <p className="text-xl font-bold text-green-800">{formatIDR(campaign.current_amount)}</p>
                    </div>
                    <div className="hidden md:block h-12 w-px bg-green-200"></div>
                    <div className="text-center md:text-right flex-1">
                      <p className="text-sm text-green-700 font-medium mb-1">Total Direalisasikan</p>
                      <p className="text-xl font-bold text-green-800">{formatIDR(campaign.total_realization || 0)}</p>
                    </div>
                  </div>

                  {realizations.length > 0 ? (
                    <div className="space-y-4">
                      {realizations.map((item) => (
                        <div key={item.id} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                              {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{formatIDR(item.nominal)}</span>
                          </div>
                          <h4 className="font-bold text-gray-800 mb-1">Keterangan:</h4>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-bold text-gray-800 mb-1 text-xs">Penerima Manfaat:</h4>
                              <p className="text-xs text-gray-600 italic">{item.beneficiaries}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800 mb-1 text-xs">Status:</h4>
                              <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-100">
                                {item.beneficiary_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Belum ada data realisasi untuk charity ini.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrowdfundingCampaignDetail;