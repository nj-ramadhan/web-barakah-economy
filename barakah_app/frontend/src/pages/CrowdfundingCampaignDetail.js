// pages/CrowdfundingCampaignDetail.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
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
      <div className="px-4 py-4">
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <img
            src={campaign.thumbnail || '/placeholder-image.jpg'}
            alt={campaign.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">{campaign.title}</h1>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Terkumpul: {campaign.current_amount ? formatIDR(campaign.current_amount) : 'Rp. 0'}
              </span>
              <span className="text-sm text-gray-600">
                Target: {campaign.target_amount ? formatIDRTarget(campaign.target_amount) : 'Rp. 0'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full"
                  style={{
                    width: `${campaign.current_amount && campaign.target_amount
                      ? Math.min((campaign.current_amount / campaign.target_amount) * 100, 100)
                      : 0}%`,
                  }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {campaign.target_amount > 0
                  ? Math.round((campaign.current_amount / campaign.target_amount) * 100)
                  : 0} % tercapai
              </div>
            </div>

            {/* Deadline */}
            <p className="text-sm text-gray-600">
              Batas waktu: {deadlineText}
            </p>

            {/* Expired Message */}
            {isExpired && (
              <p className="text-sm text-red-500">Kampanye ini telah berakhir.</p>
            )}
          </div>
          <div className="p-3">
            {isExpired ? (
              <button
                className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                disabled
              >
                DONASI SEKARANG
              </button>
            ) : (
              <Link
                to={`/bayar-donasi/${campaign.slug}`}
                className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
              >
                DONASI SEKARANG
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 px-4">
        <div className="flex justify-around bg-white border-b">
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