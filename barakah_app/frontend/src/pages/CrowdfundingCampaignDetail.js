// pages/CrowdfundingCampaignDetail.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import '../styles/Body.css';

const getTimeElapsed = (createdAt) => {
  const createdDate = new Date(createdAt);
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
    return `${seconds} detik lalu`;
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
  return new Date(deadline) < new Date();
};

const formatDeadline = (deadline) => {
  if (!deadline) return 'tidak ada';
  const date = new Date(deadline);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getButtonLabel = (title = '') => {
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

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        const campaignResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/${slug}/`);
        setCampaign(campaignResponse.data);

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
      </Helmet>

      <Header />
      {/* Campaign Details */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col md:flex-row">
          <div className="md:w-1/2">
            <img
              src={campaign.thumbnail || '/placeholder-image.jpg'}
              alt={campaign.title}
              className="w-full h-64 md:h-full object-cover"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
          </div>
          <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">{campaign.title}</h1>
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-green-700">
                  Terkumpul: {campaign.current_amount ? formatIDR(campaign.current_amount) : 'Rp. 0'}
                </span>
                <span className="text-sm text-gray-500">
                  Target: {campaign.target_amount ? formatIDRTarget(campaign.target_amount) : 'Rp. 0'}
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
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-6">
                <span className="material-icons text-sm">schedule</span>
                Batas waktu: {deadlineText}
              </div>

              {/* Expired Message */}
              {isExpired && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                  <span className="material-icons text-sm">error_outline</span>
                  Kampanye ini telah berakhir.
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
                    {getButtonLabel(campaign.title)}
                  </button>
                ) : (
                  <Link
                    to={`/bayar-donasi/${campaign.slug}`}
                    className="block text-center bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition shadow-md"
                  >
                    {getButtonLabel(campaign.title)}
                  </Link>
                )}
              </div>
              <ShareButton slug={campaign.slug} title={campaign.title} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 px-4 max-w-6xl mx-auto pb-20">
        <div className="flex justify-start gap-8 bg-white border-b px-6">
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'description' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('description')}
          >
            Keterangan
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'donations' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('donations')}
          >
            Donatur ({donations.length})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'updates' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('updates')}
          >
            Kabar Terbaru ({campaign.updates ? campaign.updates.length : 0})
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
            <div className="bg-white p-4 rounded-lg shadow">
              <ul>
                {donations.length > 0 ? (
                  donations.map((donation, index) => (
                    <li key={index} className="border-b py-2 px-4">
                      <div className="flex justify-between items-center">
                        <p className="text-green-700 font-semibold">
                          <strong>{donation.donor_name}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(donation.transfer_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })} - {getTimeElapsed(donation.transfer_date)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatIDR(donation.amount)}
                      </p>
                    </li>
                  ))
                ) : (
                  <li className="py-2 px-4 text-gray-500">Belum ada donasi yang terverifikasi.</li>
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
        </div>
      </div>

      <NavigationButton />
    </div>
  );
};

export default CrowdfundingCampaignDetail;