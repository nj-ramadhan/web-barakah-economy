// components/CampaignGrid.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CampaignGrid = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/campaigns/');
        setCampaigns(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch campaigns');
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">All Campaigns</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div 
            key={campaign.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="relative h-24">
              <img
                src={campaign.thumbnail || '/placeholder-image.jpg'}
                alt={campaign.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{campaign.title}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {campaign.description?.substring(0, 150)}...
              </p>
              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min(
                        ((campaign.current_amount || 0) / (campaign.target_amount || 1)) * 100,
                        100
                      )}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600 font-medium">
                    ${campaign.current_amount || 0} raised
                  </span>
                  <span className="text-gray-600">
                    Goal: ${campaign.target_amount || 0}
                  </span>
                </div>
                <Link 
                  to={`/campaign/${campaign.id}`}
                  className="block text-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Campaign
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignGrid;