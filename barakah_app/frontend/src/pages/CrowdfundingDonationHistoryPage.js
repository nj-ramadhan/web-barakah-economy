// pages/CrowdfundingDonationHistoryPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount);
  };

const formatDate = (dates) => {
    if (!dates) return 'tidak ada'; // Campaigns with no deadline
    const date = new Date(dates);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
  };

const CrowdfundingDonationHistoryPage = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);

    const fetchDonations = useCallback(async () => {
        try {
            // Retrieve the user object from Local Storage
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Check if the user object and access token exist
            if (!user || !user.access) {
                console.error('User not logged in or token missing');
                navigate('/login');  // Redirect to login page
                return;
            }
    
            // Log the token for debugging
            console.log('User token:', user.access);
    
            // Make the API request with the token in the headers
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/donations/donation/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,  // Use "Bearer" for JWT tokens
                },
            });
    
            // Log the response for debugging
            console.log('Donation items fetched:', response.data);
    
            // Update the state with the fetched wishlist items
            setDonations(response.data);
        } catch (error) {
            console.error('Error fetching donation items:', error);
    
            // Handle specific error cases
            if (error.response) {
                console.error('Error response:', error.response);
    
                // Handle 403 Forbidden (token invalid or expired)
                if (error.response.status === 403) {
                    console.error('Token expired or invalid. Redirecting to login...');
                    localStorage.removeItem('user');  // Clear the invalid token
                    navigate('/login');  // Redirect to login page
                }
            }
        }
    }, [navigate]);

    useEffect(() => {
        fetchDonations();
    }, [fetchDonations]);

    return (
        <div className="body">
            <Header />
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-lg font-bold">Riwayat Donasi</h1>
                </div>
                <button
                    onClick={() => navigate('/donasi')}
                    className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
                >
                    <span className="material-icons text-sm mr-4">volunteer_activism</span>DONASI SEKARANG
                </button>
                {donations.length === 0 ? (
                    <p className="text-gray-600 mt-4">Kamu belum pernah donasi.</p>
                    
                ) : (
                    <ul className="space-y-4 mt-4">
                        {donations.map((item) => (
                            <li key={item.id} className="p-4 border rounded-lg shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="flex justify-left items-center">
                                        <img 
                                            src={item.campaign.thumbnail || 'media/campaign_images/poster_berkah_malam.jpg'} 
                                            alt={item.campaign.title}
                                            className="w-12 h-12 object-cover mr-4"
                                            onError={(e) => {
                                                e.target.src = 'media/campaign_images/poster_berkah_malam.jpg';
                                            }}
                                            />
                                        <div className="justify-left">
                                            <h3 className="text-sm font-semibold">{item.campaign_title}</h3>
                                            <p className="text-gray-600 text-xs">Nominal : {formatIDR(item.amount)}</p>
                                            <p className="text-gray-600 text-xs">Tanggal : {formatDate(item.created_at)}</p>
                                        </div>    
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default CrowdfundingDonationHistoryPage;