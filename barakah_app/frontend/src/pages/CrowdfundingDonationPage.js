// pages/CrowdfundingDonationPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
};
// Define category-based additional amounts
const categoryAdditionalAmounts = {
  infak: { value: 25 },
  sedekah: { value: 50 },
  zakat: { value: 75 },
  donasi: { value: 100 },
  bencana: { value: 125 },
  kemanusiaan: { value: 150 },
  kesehatan: { value: 175 },
  lingkungan: { value: 200 },
  pembangunan: { value: 225 },
  sosial: { value: 250 },
  lainnya: { value: 275 },
  default: { value: 300 },
};

const CrowdfundingDonationPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    hideIdentity: false,
    phone: '',
    email: '',
    message: '',
  });

  useEffect(() => {
    // Check if Snap.js is already loaded
    if (typeof window.snap === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.dataset.clientKey = 'SB-Mid-client-wm4shJTARC2PTcY6';
      script.onload = () => {
        console.log('Snap.js loaded successfully.');
      };
      script.onerror = () => {
        console.error('Failed to load Snap.js.');
      };
      document.body.appendChild(script);

      // Cleanup on unmount
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  useEffect(() => {
    // Fetch campaign details
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/${slug}/`);
        setCampaign(response.data);
      } catch (err) {
        console.error('Error fetching campaign:', err);
        // Use placeholder data if API fails
        setCampaign({
          title: 'Program Donasi',
          banner: `/images/${slug}.jpg`,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [slug]);

  const donationAmounts = [
    { label: 'Rp 25 rb', value: 25000 },
    { label: 'Rp 50 rb', value: 50000 },
    { label: 'Rp 100 rb', value: 100000 },
    { label: 'Rp 200 rb', value: 200000 },
    { label: 'Rp 500 rb', value: 500000 },
    { label: 'Rp 1 jt', value: 1000000 },
    { label: 'Rp 2,5 jt', value: 2500000 },
    { label: 'Rp 5 jt', value: 5000000 },
    { label: 'Rp 10 jt', value: 10000000 },
    { label: 'Rp 20 jt', value: 20000000 },
    { label: 'Rp 50 jt', value: 50000000 },
    { label: 'Nominal Lainnya', value: 'custom' },
  ];

  const banks = [
    {
      id: 'bsi',
      name: 'Bank BSI',
      logo: '/images/bsi-logo.png',
    },
    // {
    //   id: 'midtrans',
    //   name: 'Midtrans (Gopay, OVO, etc)',
    //   logo: '/images/gopay-logo.png',
    // },
  ];

  const handlePayment = async (token) => {
    if (typeof window.snap !== 'undefined') {
      window.snap.pay(token, {
        onSuccess: async (result) => {
          console.log('Payment success:', result);
  
          // Notify the backend about the successful payment
          try {
            const response = await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/api/payments/update-payment-status/`,
              {
                transactionId: result.transaction_id, // Midtrans transaction ID
                // status: 'success', // Payment status
                status: 'verified', // Payment status
                amount: result.gross_amount, // Payment amount
                paymentMethod: result.payment_type, // Payment method (e.g., gopay, bank transfer)
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
                },
              }
            );
  
            if (response.status === 200) {
              console.log('Payment status updated successfully.');
              navigate('/success', {
                state: {
                  transactionId: result.transaction_id,
                  amount: result.gross_amount,
                  paymentMethod: result.payment_type,
                },
              });
            } else {
              console.error('Failed to update payment status:', response.data);
              alert('Payment successful, but failed to update status. Please contact support.');
            }
          } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Payment successful, but failed to update status. Please contact support.');
          }
        },
        onPending: async (result) => {
          console.log('Payment pending:', result);
  
          // Notify the backend about the pending payment
          try {
            const response = await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/api/payments/update-payment-status/`,
              {
                transactionId: result.transaction_id, // Midtrans transaction ID
                status: 'pending', // Payment status
                amount: result.gross_amount, // Payment amount
                paymentMethod: result.payment_type, // Payment method (e.g., gopay, bank transfer)
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
                },
              }
            );
  
            if (response.status === 200) {
              console.log('Payment status updated successfully.');
              alert('Payment is pending. Please complete the payment.');
            } else {
              console.error('Failed to update payment status:', response.data);
              alert('Payment pending, but failed to update status. Please contact support.');
            }
          } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Payment pending, but failed to update status. Please contact support.');
          }
        },
        onError: (error) => {
          console.error('Payment error:', error);
          alert('Payment failed. Please try again.');
        },
        onClose: () => {
          console.log('Payment popup closed');
          alert('Payment canceled. Please complete the payment to proceed.');
        },
      });
    } else {
      console.error('Snap.js is not loaded.');
      alert('Payment gateway is not available. Please try again later.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const csrfToken = getCsrfToken();
    // const authToken = localStorage.getItem('authToken');

    // Validate form
    if (!selectedAmount || (selectedAmount === 'custom' && !customAmount)) {
      alert('Silakan pilih nominal donasi');
      return;
    }

    if (!selectedBank) {
      alert('Silakan pilih metode pembayaran');
      return;
    }

    // Generate additional amount based on category
    const category = campaign?.category || 'default';
    const { value } = categoryAdditionalAmounts[category];
    const uniqueDigits = value;
    const amount = selectedAmount === 'custom' ? parseInt(customAmount) : selectedAmount;
    const finalAmount = amount + uniqueDigits;

    // Set the display name based on hideIdentity checkbox
    const donorName = formData.hideIdentity ? 'Hamba Allah' : formData.fullName;
    const donorPhone = formData.phone;

    const paymentData = {
      amount: finalAmount,
      donorName: donorName,
      donorPhone: donorPhone,
      campaignSlug: slug
    };

    // If Midtrans is selected, handle payment via Midtrans
    if (selectedBank === 'midtrans') {
      try {
        // Fetch payment token from backend
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/payments/generate-donation-midtrans-token/`,
          paymentData,{
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
          }
        );

        const { token } = response.data;

      // Trigger the payment popup
      handlePayment(token);
      } catch (error) {
        console.error('Error generating Midtrans token:', error);
        alert('Terjadi kesalahan saat memproses pembayaran.');
      }
    } else {
      // Navigate to payment confirmation for Bank BSI
      navigate('/konfirmasi-pembayaran-donasi', {
        state: {
          amount: finalAmount,
          bank: selectedBank,
          campaignSlug: slug,
          campaignTitle: campaign?.title || 'Program Donasi',
          donorName: donorName,
          fullName: formData.fullName,
          hideIdentity: formData.hideIdentity,
          donorPhone: donorPhone,
          email: formData.email,
          message: formData.message,
        },
      });
    }
  };

  return (
    <div className="body">
      <Header />
      {/* Header with program image - now dynamic */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 relative">
        {loading ? (
          <div className="w-full h-58 bg-green-500 animate-pulse"></div>
        ) : (
          <>
            <img
              src={campaign?.thumbnail || campaign?.banner || `/images/${slug}.jpg`}
              alt={campaign?.title || 'Program Banner'}
              className="w-full h-58 object-cover"
              onError={(e) => {
                e.target.src = '/images/default-campaign.jpg';
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h1 className="text-white font-bold text-xl">
                {campaign?.title || 'Program Donasi'}
              </h1>
            </div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        <h2 className="text-xl font-semibold mb-6 text-center">Donasi Terbaik Anda</h2>

        {/* Donation Amount Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {donationAmounts.map((amount) => (
            <button
              key={amount.value}
              className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                selectedAmount === amount.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-green-50'
              }`}
              onClick={() => setSelectedAmount(amount.value)}
            >
              {amount.label}
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        {selectedAmount === 'custom' && (
          <div className="mb-6">
            <div className="flex items-center bg-white rounded-lg px-3 shadow-sm">
              <span className="text-gray-500">Rp</span>
              <input
                type="number"
                className="flex-1 py-3 px-2 outline-none"
                placeholder="Masukan Nominal"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Payment Method */}
        <h3 className="font-semibold mb-3">Transfer ke</h3>
        <div className="space-y-3 mb-6">
          {banks.map((bank) => (
            <label
              key={bank.id}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                selectedBank === bank.id
                  ? 'bg-green-50 border border-green-500'
                  : 'bg-white border border-transparent hover:bg-green-50/50'
              }`}
            >
              <input
                type="radio"
                name="bank"
                value={bank.id}
                checked={selectedBank === bank.id}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="mr-3 accent-green-600"
              />
              <img src={bank.logo} alt={bank.name} className="h-6 mr-2" />
              <span>{bank.name}</span>
            </label>
          ))}
        </div>

        {/* Personal Data Form */}
        <h3 className="font-semibold mb-3">Data Anda</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center mb-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="hideIdentity"
                checked={formData.hideIdentity}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    hideIdentity: isChecked,
                    fullName: isChecked ? 'Hamba Allah' : '',
                  }));
                }}
                className="mr-2 accent-green-600"
              />
              <span className="text-sm">Sembunyikan Nama Anda (Hamba Allah)</span>
            </label>
          </div>

          <div>
            <input
              type="text"
              name="fullName"
              placeholder="Nama Lengkap Anda (wajib diisi)"
              className={`w-full p-3 rounded-lg border ${
                formData.hideIdentity ? 'bg-gray-100 border-gray-300' : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500'
              } outline-none`}
              value={formData.fullName}
              onChange={handleInputChange}
              disabled={formData.hideIdentity}
              required
            />
          </div>

          <div>
            <input
              type="tel"
              name="phone"
              placeholder="No Whatsapp atau Handphone (wajib diisi)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Anda (opsional)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <textarea
              name="message"
              placeholder="Pesan atau do'a Anda (opsional)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              rows="3"
              value={formData.message}
              onChange={handleInputChange}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Lanjutkan Pembayaran
          </button>
        </form>
      </div>
      <NavigationButton />
    </div>
  );
};

export default CrowdfundingDonationPage;
