// pages/CampaignDetail.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const CampaignDetail = () => {
  const { slug } = useParams(); // Get the slug from the URL
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/campaigns/${slug}/`);
        setCampaign(response.data);
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

  return (
    <div className="bg-gray-100 min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src="/images/logo.png" alt="YPMN" className="h-8" />
              <span className="ml-2 font-semibold text-green-700">YPMN PEDULI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Campaign Details */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <img
            src={campaign.thumbnail || '/placeholder-image.jpg'}
            alt={campaign.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">{campaign.title}</h1>
            <p className="text-gray-700 mb-4">{campaign.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Terkumpul: Rp {campaign.amount_raised}</span>
              <span className="text-sm text-gray-600">Target: Rp {campaign.target_amount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Donation Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t max-w-md mx-auto">
        <div className="p-4">
          <Link
            to={`/donasi/${campaign.slug || campaign.id}`}
            className="block text-center bg-green-800 text-white py-3 rounded-md text-sm hover:bg-green-900"
          >
            DONASI SEKARANG
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;