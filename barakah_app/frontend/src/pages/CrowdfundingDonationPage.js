// pages/CrowdfundingDonationPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import CurrencyInput from '../components/common/CurrencyInput';
import { getPublicPaymentConfig } from '../services/paymentApi';
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
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [uniqueAdminFee] = useState(() => Math.floor(Math.random() * 400) + 100); // 100 - 499

  // Waqaf & Collaboration States
  const [donationMode, setDonationMode] = useState('donation'); // 'donation' or 'waqaf'
  const [waqafCart, setWaqafCart] = useState({}); // { [productId]: qty }

  useEffect(() => {
    getPublicPaymentConfig().then(cfg => setPaymentConfig(cfg)).catch(e => console.error(e));
  }, []);
  const [formData, setFormData] = useState({
    fullName: '',
    hideIdentity: false,
    phone: '',
    email: '',
    message: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let phoneVal = '';
    let nameVal = '';
    let emailVal = '';

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        nameVal = user.full_name || user.first_name || user.username || '';
        emailVal = user.email || '';
        phoneVal = user.phone_number || user.phone || user.no_whatsapp || user.whatsapp || user.no_hp || user.handphone || '';
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }

    setFormData(prev => ({
      ...prev,
      fullName: nameVal || prev.fullName,
      email: emailVal || prev.email,
      phone: phoneVal || prev.phone
    }));

    // Fetch full profile from API to ensure phone is auto-filled if missing in local state
    const token = localStorage.getItem('token') || (userStr ? JSON.parse(userStr)?.access : null);
    if (token) {
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/accounts/profile/`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data) {
          const profilePhone = res.data.phone_number || res.data.phone || res.data.whatsapp || res.data.no_hp || res.data.no_whatsapp || '';
          const profileName = res.data.full_name || res.data.username || '';
          const profileEmail = res.data.email || '';

          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || profileName,
            email: prev.email || profileEmail,
            phone: prev.phone || profilePhone
          }));
        }
      }).catch(() => {
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/me/`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res2 => {
          if (res2.data) {
            const pPhone = res2.data.phone_number || res2.data.whatsapp || res2.data.phone || res2.data.no_hp || '';
            if (pPhone) {
              setFormData(prev => ({ ...prev, phone: prev.phone || pPhone }));
            }
          }
        }).catch(() => { });
      });
    }
  }, []);

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
        if (response.data.is_collaboration && response.data.collaboration_type === 'waqaf' && response.data.collab_products_details?.length > 0) {
          setDonationMode('waqaf');
          const firstP = response.data.collab_products_details[0];
          if (firstP && firstP.stock > 0) {
            setWaqafCart({ [firstP.id]: 1 });
          }
        }
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

  const hasWaqafCollab = Boolean(
    campaign?.is_collaboration && 
    campaign?.collaboration_type === 'waqaf' && 
    campaign?.collab_products_details?.length > 0
  );

  const updateWaqafQty = (productId, delta, maxStock) => {
    setWaqafCart(prev => {
      const current = prev[productId] || 0;
      const updated = Math.max(0, Math.min(maxStock, current + delta));
      if (updated === 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: updated };
    });
  };

  const selectedWaqafItems = useMemo(() => {
    if (!campaign?.collab_products_details) return [];
    return campaign.collab_products_details
      .filter(p => (waqafCart[p.id] || 0) > 0)
      .map(p => ({
        product_id: p.id,
        product_title: p.title,
        product_unit: p.unit,
        price: Number(p.price),
        quantity: waqafCart[p.id],
        subtotal: Number(p.price) * waqafCart[p.id]
      }));
  }, [campaign, waqafCart]);

  const totalWaqafAmount = useMemo(() => {
    return selectedWaqafItems.reduce((sum, it) => sum + it.subtotal, 0);
  }, [selectedWaqafItems]);

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
    {
      id: 'qris',
      name: 'QRIS',
      logo: '/images/qris-bae2.png',
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

  useEffect(() => {
    if (paymentConfig?.active_mode === 'dynaqris') {
      setSelectedBank('qris');
    }
  }, [paymentConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const csrfToken = getCsrfToken();
    const isWaqaf = donationMode === 'waqaf';

    // Validate form
    if (isWaqaf) {
      if (selectedWaqafItems.length === 0 || totalWaqafAmount <= 0) {
        alert('Silakan pilih minimal 1 produk store yang ingin diwakafkan beserta jumlahnya.');
        return;
      }
      if (!formData.fullName.trim() || ['hamba allah', 'anonim', 'anonymous'].includes(formData.fullName.trim().toLowerCase())) {
        alert('Untuk program waqaf, biodata asli (nama lengkap) wajib diisi dan tidak dapat disamarkan.');
        return;
      }
    } else {
      if (!selectedAmount || (selectedAmount === 'custom' && !customAmount)) {
        alert('Silakan pilih nominal donasi');
        return;
      }
      if (!formData.fullName.trim()) {
        alert('Silakan masukkan nama lengkap Anda (wajib diisi)');
        return;
      }
    }

    if (!formData.phone.trim()) {
      alert('Silakan masukkan nomor WhatsApp atau Handphone Anda (wajib diisi)');
      return;
    }

    if (!formData.email.trim()) {
      alert('Silakan masukkan alamat Email Anda (wajib diisi untuk pengiriman bukti donasi)');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email.trim())) {
      alert('Format email tidak valid. Silakan masukkan alamat email yang benar.');
      return;
    }

    const effectiveBank = (paymentConfig?.active_mode === 'dynaqris') ? 'qris' : selectedBank;
    if (!effectiveBank) {
      alert('Silakan pilih metode pembayaran');
      return;
    }

    // Generate additional amount based on category if manual transfer mode (for finance tracking)
    const category = campaign?.category || 'default';
    const { value } = categoryAdditionalAmounts[category] || { value: 0 };
    const amount = isWaqaf ? totalWaqafAmount : (selectedAmount === 'custom' ? parseInt(customAmount || 0) : parseInt(selectedAmount || 0));
    const isDynaQRISActive = (paymentConfig?.active_mode === 'dynaqris') || (effectiveBank === 'qris');
    const appliedFee = isDynaQRISActive ? uniqueAdminFee : value;
    const finalAmount = amount + appliedFee;

    // Set the real donor name
    const donorName = formData.fullName.trim();
    const donorPhone = formData.phone;
    const isAnonymous = isWaqaf ? false : Boolean(formData.hideIdentity);

    // Only create a pending donation record if QRIS is active (needed for QRIS auto-tracking)
    // For manual transfer, donation will be created only when user uploads proof & confirms payment
    let createdDonationId = null;
    if (isDynaQRISActive) {
      try {
        const formDataObj = new FormData();
        formDataObj.append('amount', finalAmount);
        formDataObj.append('admin_fee', appliedFee);
        formDataObj.append('donor_name', donorName);
        formDataObj.append('donor_phone', donorPhone);
        formDataObj.append('donor_email', formData.email || '');
        formDataObj.append('payment_method', effectiveBank);
        formDataObj.append('donation_type', donationMode);
        formDataObj.append('is_anonymous', isAnonymous ? 'true' : 'false');
        if (isWaqaf) {
          formDataObj.append('waqaf_items', JSON.stringify(selectedWaqafItems));
        }
        if (formData.message) formDataObj.append('message', formData.message);

        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token') || (userStr ? JSON.parse(userStr)?.access : null);

        const res = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/donations/${slug}/create-donation/`,
          formDataObj,
          {
            headers: {
              'X-CSRFToken': csrfToken,
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          }
        );
        if (res.data && res.data.donation_id) {
          createdDonationId = res.data.donation_id;
        }
      } catch (err) {
        console.error("Error creating initial pending donation record:", err);
      }
    }

    const paymentData = {
      amount: finalAmount,
      donorName: donorName,
      donorPhone: donorPhone,
      campaignSlug: slug,
      donationType: donationMode,
      isAnonymous: isAnonymous,
      waqafItems: isWaqaf ? selectedWaqafItems : []
    };

    // If Midtrans is selected, handle payment via Midtrans
    if (effectiveBank === 'midtrans') {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/payments/generate-donation-midtrans-token/`,
          paymentData, {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
        }
        );

        const { token } = response.data;
        handlePayment(token);
      } catch (error) {
        console.error('Error generating Midtrans token:', error);
        alert('Terjadi kesalahan saat memproses pembayaran.');
      }
    } else {
      navigate('/konfirmasi-pembayaran-donasi', {
        state: {
          donationId: createdDonationId,
          amount: finalAmount,
          baseAmount: amount,
          uniqueFee: appliedFee,
          addUniqueCode: false,
          bank: effectiveBank,
          campaignSlug: slug,
          campaignTitle: campaign?.title || 'Program Donasi',
          donorName: donorName,
          fullName: formData.fullName,
          hideIdentity: isAnonymous,
          isAnonymous: isAnonymous,
          donorPhone: donorPhone,
          email: formData.email,
          message: formData.message,
          donationType: donationMode,
          waqafItems: isWaqaf ? selectedWaqafItems : []
        },
      });
    }
  };

  return (
    <div className="body">
      <Header />
      {/* Header with program image */}
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
        {/* Toggle Mode Switcher if Campaign has Waqaf collaboration */}
        {hasWaqafCollab ? (
          <div className="mb-6">
            {/* Tab Bar Header */}
            <div className="flex border-b-2 border-gray-100 mb-5">
              <button
                type="button"
                onClick={() => setDonationMode('waqaf')}
                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all rounded-t-lg ${
                  donationMode === 'waqaf'
                    ? 'text-green-600 border-green-600 bg-green-50/40'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="material-icons text-base sm:text-lg">inventory_2</span>
                <span>Waqaf Produk Store</span>
              </button>

              <button
                type="button"
                onClick={() => setDonationMode('donation')}
                className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all rounded-t-lg ${
                  donationMode === 'donation'
                    ? 'text-green-600 border-green-600 bg-green-50/40'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="material-icons text-base sm:text-lg">volunteer_activism</span>
                <span>Donasi Tunai</span>
              </button>
            </div>

            <h2 className="text-lg font-bold text-gray-800 text-center">
              {donationMode === 'waqaf' ? 'Pilih Produk yang Ingin Diwakafkan' : 'Donasi Terbaik Anda'}
            </h2>
          </div>
        ) : (
          <h2 className="text-xl font-semibold mb-6 text-center">Donasi Terbaik Anda</h2>
        )}

        {/* WAQAF PRODUCTS PICKER */}
        {donationMode === 'waqaf' && hasWaqafCollab ? (
          <div className="mb-6 space-y-3">
            <p className="text-xs text-gray-500">
              Pilih produk dan tentukan kuantitas yang ingin Anda wakafkan. Nominal donasi dihitung otomatis:
            </p>

            <div className="space-y-2.5">
              {[...(campaign.collab_products_details || [])]
                .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
                .map((p) => {
                const currentQty = waqafCart[p.id] || 0;
                const isOutOfStock = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      currentQty > 0
                        ? 'bg-teal-50/70 border-teal-300 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="w-14 h-14 object-cover rounded-xl shrink-0" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                          <span className="material-icons text-gray-400">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{p.title}</h4>
                          {p.has_campaign && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              {p.campaign_title || 'Harga Kampanye'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                          <p className="text-xs font-black text-teal-700">
                            Rp {Number(p.price).toLocaleString('id-ID')} <span className="text-[10px] font-normal text-gray-500">/ {p.unit || 'unit'}</span>
                          </p>
                          {p.original_price && Number(p.original_price) > Number(p.price) && (
                            <span className="text-[10px] text-gray-400 line-through">
                              Rp {Number(p.original_price).toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {isOutOfStock ? (
                            <span className="text-red-500 font-bold">Stok Habis</span>
                          ) : (
                            `Stok: ${p.stock} ${p.unit || 'pcs'}`
                          )}
                        </p>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateWaqafQty(p.id, -1, p.stock)}
                          disabled={currentQty <= 0}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center disabled:opacity-30 transition font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-black text-gray-900">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateWaqafQty(p.id, 1, p.stock)}
                          disabled={isOutOfStock || currentQty >= p.stock}
                          className="w-7 h-7 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center disabled:opacity-30 transition font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {currentQty > 0 && (
                      <div className="mt-2 pt-2 border-t border-teal-200/60 flex justify-between items-center text-[11px]">
                        <span className="text-gray-500">Subtotal ({currentQty} {p.unit || 'unit'}):</span>
                        <span className="font-black text-teal-800">
                          Rp {(Number(p.price) * currentQty).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* REGULAR DONATION AMOUNT GRID */
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {donationAmounts.map((amount) => (
                <button
                  key={amount.value}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition-colors ${selectedAmount === amount.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-green-50'
                    }`}
                  onClick={() => setSelectedAmount(amount.value)}
                >
                  {amount.label}
                </button>
              ))}
            </div>

            {selectedAmount === 'custom' && (
              <div className="mb-6">
                <CurrencyInput
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Masukkan Nominal"
                />
              </div>
            )}
          </>
        )}

        {/* Payment Method */}
        {paymentConfig?.active_mode === 'dynaqris' ? (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Metode Pembayaran</h3>
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="material-icons text-3xl text-emerald-600">qr_code_2</span>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">QRIS (Pembayaran Instan)</h4>
                  <p className="text-xs text-gray-500">Scan via GoPay, OVO, Dana, ShopeePay, m-Banking, dll.</p>
                </div>
              </div>
              <span className="bg-emerald-600 text-white text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider shrink-0">TERPILIH</span>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-semibold mb-3">Transfer ke</h3>
            <div className="space-y-3 mb-6">
              {banks.map((bank) => (
                <label
                  key={bank.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedBank === bank.id
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
          </>
        )}

        {/* Personal Data Form */}
        <h3 className="font-semibold mb-3">Data Anda</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {donationMode === 'waqaf' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 mb-2">
              <span className="material-icons text-amber-600 text-base shrink-0 mt-0.5">verified_user</span>
              <p className="text-xs text-amber-800 leading-tight">
                <b>Ketentuan Akad Waqaf:</b> Biodata donatur <b>tidak dapat disamarkan</b>. Nama lengkap asli, nomor WhatsApp, dan email wajib diisi.
              </p>
            </div>
          ) : (
            <div className="mb-2">
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
                    }));
                  }}
                  className="mr-2 accent-green-600"
                />
                <span className="text-sm font-medium text-gray-700">Sembunyikan Nama Anda (Hamba Allah)</span>
              </label>
              {formData.hideIdentity && (
                <p className="text-[11px] text-gray-500 mt-1 pl-6">
                  Nama asli Anda tetap tercatat di sistem admin, tetapi akan disamarkan sebagai &quot;Hamba Allah&quot; di daftar donatur publik.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Nama Lengkap Anda (wajib diisi)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              No. WhatsApp / HP <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="No Whatsapp atau Handphone (wajib diisi)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="Email Anda (wajib diisi)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <span className="material-icons text-xs">info</span>
              Wajib diisi untuk pengiriman bukti &amp; tanda terima donasi Anda
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Pesan / Do'a <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              name="message"
              placeholder="Pesan atau do'a Anda (opsional)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
              rows="3"
              value={formData.message}
              onChange={handleInputChange}
            />
          </div>

          {/* Rincian Donasi / Waqaf & Akad Ijarah */}
          {(() => {
            const isWaqaf = donationMode === 'waqaf';
            const numAmount = isWaqaf ? totalWaqafAmount : (selectedAmount === 'custom' ? parseInt(customAmount || 0) : parseInt(selectedAmount || 0));
            const isDynaQRIS = (paymentConfig?.active_mode === 'dynaqris') || (selectedBank === 'qris');
            const fee = isDynaQRIS ? uniqueAdminFee : 0;
            const grandTotal = numAmount + fee;

            if (numAmount <= 0) return null;

            return (
              <div className={`${isWaqaf ? 'bg-teal-50/90 border-teal-200' : 'bg-emerald-50/80 border-emerald-100'} p-4 rounded-xl border space-y-2.5`}>
                {isWaqaf ? (
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-teal-900 mb-2">
                      <span>Rincian Produk Waqaf</span>
                      <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">
                        {selectedWaqafItems.reduce((acc, it) => acc + it.quantity, 0)} Item
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedWaqafItems.map((it) => (
                        <div key={it.product_id} className="flex justify-between items-center text-xs text-gray-700 bg-white/80 p-2 rounded-lg border border-teal-100">
                          <span className="truncate max-w-[200px]">{it.quantity}x {it.product_title}</span>
                          <span className="font-semibold text-teal-800">Rp {new Intl.NumberFormat('id-ID').format(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-700 pt-2 border-t border-teal-200/60 mt-2">
                      <span>Total Nilai Waqaf</span>
                      <span className="font-bold">Rp {new Intl.NumberFormat('id-ID').format(numAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-xs text-gray-700">
                    <span>Nominal Donasi</span>
                    <span className="font-bold">Rp {new Intl.NumberFormat('id-ID').format(numAmount)}</span>
                  </div>
                )}

                {isDynaQRIS && (
                  <div className="flex justify-between items-center text-xs text-emerald-800 font-semibold bg-white/90 p-2.5 rounded-lg border border-emerald-100">
                    <div className="flex flex-col">
                      <span>Biaya Layanan & Admin (Akad Ijarah)</span>
                      <span className="text-[10px] text-emerald-600 font-normal">*Pembayaran Instant</span>
                    </div>
                    <span>+ Rp {new Intl.NumberFormat('id-ID').format(uniqueAdminFee)}</span>
                  </div>
                )}

                <div className={`pt-2 border-t ${isWaqaf ? 'border-teal-200/70' : 'border-emerald-200/70'} flex justify-between items-center`}>
                  <span className={`text-xs font-bold uppercase ${isWaqaf ? 'text-teal-900' : 'text-emerald-900'}`}>
                    Total {isWaqaf ? 'Waqaf' : 'Donasi'}
                  </span>
                  <span className={`text-lg font-black ${isWaqaf ? 'text-teal-700' : 'text-emerald-700'}`}>
                    Rp {new Intl.NumberFormat('id-ID').format(grandTotal)}
                  </span>
                </div>
              </div>
            );
          })()}

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
