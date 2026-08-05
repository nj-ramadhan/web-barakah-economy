import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import DynaQRISModal from '../components/common/DynaQRISModal';
import { getPublicPaymentConfig, generateDynaQRIS, checkDynaQRISStatus, verifyDynaQRISPayment } from '../services/paymentApi';
import '../styles/Body.css';

const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
};

const formatDate = (deadline) => {
  if (!deadline) return 'tidak ada';
  const date = new Date(deadline);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const CrowdfundingPaymentConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    accountName: location.state?.donorName || '',
    sourceBank: location.state?.bank || '',
    sourceAccount: '',
    transferDate: new Date().toISOString().split('T')[0],
    amount: location.state?.amount || 0
  });

  // DynaQRIS In-Page State
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [qrisData, setQrisData] = useState(null);
  const [generatingQris, setGeneratingQris] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusText, setStatusText] = useState('Menunggu Pembayaran...');
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    getPublicPaymentConfig().then((cfg) => {
      setPaymentConfig(cfg);
      if (cfg?.active_mode === 'dynaqris' && location.state?.amount) {
        handleGenerateDynaQRIS();
      }
    }).catch(err => console.error("Error fetching config:", err));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleGenerateDynaQRIS = async () => {
    const donationId = location.state?.donationId;
    const campaignSlug = location.state?.campaignSlug || 'charity';
    const referenceId = donationId || campaignSlug;
    const sessionKey = `qris_session_charity_${referenceId}_${location.state?.amount}`;
    
    // Check active session to avoid spamming requests
    const savedSession = localStorage.getItem(sessionKey);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.expiresAt) {
          const remainingSec = Math.floor((new Date(parsed.expiresAt) - new Date()) / 1000);
          if (remainingSec > 0) {
            setQrisData(parsed.qrisData);
            setTimeLeft(remainingSec);
            startCountdownAndPolling(parsed.qrisData, remainingSec, referenceId);
            return;
          } else {
            localStorage.removeItem(sessionKey);
          }
        }
      } catch (e) {
        console.error("Error parsing saved QRIS session:", e);
      }
    }

    setGeneratingQris(true);
    try {
      const res = await generateDynaQRIS({ amount: location.state?.amount, type: 'charity', reference_id: referenceId });
      if (res.error) {
        alert(res.error);
      } else {
        localStorage.setItem(sessionKey, JSON.stringify({
          qrisData: res,
          expiresAt: res.expiresAt
        }));
        setQrisData(res);
        const initSec = res.timeoutSeconds || 300;
        setTimeLeft(initSec);
        startCountdownAndPolling(res, initSec, referenceId);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan QRIS.');
    } finally {
      setGeneratingQris(false);
    }
  };

  const startCountdownAndPolling = (resData, seconds, refId) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    setTimeLeft(seconds);
    setIsExpired(false);
    setStatusText('Menunggu Pembayaran...');

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          clearInterval(pollRef.current);
          setIsExpired(true);
          setStatusText('Waktu Pembayaran Telah Habis');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const checkRes = await checkDynaQRISStatus('charity', refId);
        if (checkRes && checkRes.verified) {
          clearInterval(timerRef.current);
          clearInterval(pollRef.current);
          setStatusText('Pembayaran Berhasil Diverifikasi!');
          setIsSuccess(true);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 4000);
  };

  const handleManualCheckStatus = async () => {
    setCheckingStatus(true);
    const donationId = location.state?.donationId;
    const campaignSlug = location.state?.campaignSlug || 'charity';
    const refId = donationId || campaignSlug;
    try {
      const checkRes = await checkDynaQRISStatus('charity', refId);
      if (checkRes && checkRes.verified) {
        setStatusText('Pembayaran Berhasil Diverifikasi!');
        setIsSuccess(true);
      } else {
        const verifyRes = await verifyDynaQRISPayment('charity', refId);
        if (verifyRes && verifyRes.success) {
          setStatusText('Pembayaran Berhasil Diverifikasi!');
          setIsSuccess(true);
        } else {
          setStatusText('Pembayaran belum terdeteksi. Mohon pastikan Anda sudah scan & bayar via QRIS.');
        }
      }
    } catch (err) {
      console.error(err);
      setStatusText('Gagal mengecek status pembayaran.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Redirect if no data passed
  if (!location.state) {
    navigate('/');
    return null;
  }

  const {
    amount,
    bank,
    campaignTitle,
    donorName, // Extract the Donatur's name
    donorPhone,
    campaignSlug, // Extract campaign slug
    message: donorMessage
  } = location.state;

  if (isSuccess) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20">
        <Header />
        <div className="container max-w-lg mx-auto pt-24 px-4">
          <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-emerald-100 space-y-6 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <span className="material-icons text-5xl">check_circle</span>
            </div>

            <div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-black uppercase px-3.5 py-1.5 rounded-full tracking-wider">
                Pembayaran Berhasil
              </span>
              <h2 className="text-2xl font-black text-gray-800 mt-3">Jazakallah Khairan!</h2>
              <p className="text-xs text-gray-500 mt-1">Donasi Anda telah berhasil diterima oleh sistem.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-3 text-xs border border-gray-100">
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500 font-medium">Program Donasi</span>
                <span className="font-bold text-gray-800 text-right max-w-[200px] truncate">{campaignTitle}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500 font-medium">Nama Donatur</span>
                <span className="font-bold text-gray-800">{donorName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-2">
                <span className="text-gray-500 font-medium">Total Nominal</span>
                <span className="font-black text-emerald-700 text-sm">Rp {new Intl.NumberFormat('id-ID').format(qrisData?.amount || amount || 0)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 font-medium">Status</span>
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-black text-[10px] uppercase">SUKSES / LUNAS</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate(campaignSlug ? `/kampanye/${campaignSlug}` : '/crowdfunding')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-100 transition"
              >
                Kembali ke Program Donasi
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl text-xs transition"
              >
                Ke Beranda Utama
              </button>
            </div>
          </div>
        </div>
        <NavigationButton />
      </div>
    );
  }

  // Format amount with dot thousand separator
  const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);

  // Bank account info based on selected bank
  const bankAccounts = {
    bsi: {
      name: 'bsi',
      number: '2220606662',
      fullName: 'Bank Syariah Indonesia',
      owner: 'Barakah Economy Community'
    },
    qris: {
      name: 'qris',
      number: 'QRIS BAE COMMUNITY',
      fullName: 'QRIS',
      owner: 'BAE COMMUNITY',
      isQRIS: true
    }
  };

  const selectedBankInfo = bankAccounts[bank];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Limit file size to 5MB
        alert('Ukuran file terlalu besar. Maksimal 5MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Format file tidak didukung. Hanya JPG, PNG, dan JPEG yang diperbolehkan.');
        return;
      }

      setSelectedFile(file);
      // Create preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`${type} berhasil disalin!`);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const csrfToken = getCsrfToken();

    if (!selectedFile) {
      alert('Mohon upload bukti transfer');
      return;
    }

    if (!formData.sourceBank || (!selectedBankInfo.isQRIS && !formData.sourceAccount) || !formData.transferDate) {
      alert('Mohon lengkapi semua data yang diperlukan.');
      return;
    }

    // Prepare donation data
    const donationData = new FormData();
    donationData.append('amount', amount);
    donationData.append('donor_name', donorName);
    donationData.append('donor_phone', donorPhone);
    donationData.append('donor_email', formData.donor_email || '');
    donationData.append('payment_method', selectedBankInfo.name);
    donationData.append('source_bank', formData.sourceBank);
    donationData.append('source_account', formData.sourceAccount);
    donationData.append('transfer_date', formData.transferDate);
    donationData.append('proof_file', selectedFile);
    if (donorMessage) {
      donationData.append('message', donorMessage);
    }

    const userData = localStorage.getItem('user');

    // Parse the JSON object to extract the token
    let authToken = null;
    if (userData) {
      const user = JSON.parse(userData);
      authToken = user.access; // Extract the JWT access token
    }

    const headers = {
      'Content-Type': 'multipart/form-data',
      'X-CSRFToken': csrfToken,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`; // Include the JWT token for authenticated users
    }

    const sourceAccountInfo = selectedBankInfo.isQRIS
      ? ''
      : `, dengan No. Rekening ${formData.sourceAccount}`;

    const message = `*Donasi BAE Community*%0A
------------------------------------%0A
Bismillah..%0A
Pada hari ini,%0A 
Tanggal ${formatDate(formData.transferDate)}%0A
Saya ${formData.accountName || ''} berniat menitipkan donasi pada program ${campaignTitle}%0A
dengan nominal Rp ${formattedAmount} melalui ${selectedBankInfo.fullName}%0A
%0A
Saya mengirim donasi dari Bank ${formData.sourceBank}${sourceAccountInfo}%0A
------------------------------------%0A%0A
Bukti transfer telah saya upload, mohon konfirmasi.%0A
Semoga dapat menjadi amal ibadah bagi saya dan bermanfaat untuk program serta penerimanya`;

    try {
      // Send a request to create a new donation
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/donations/${campaignSlug}/create-donation/`,  // Use campaign_slug
        donationData,
        {
          headers: headers,
        }
      );

      console.log('Campaign Slug:', campaignSlug);

      if (response.status === 201) {
        // Open WhatsApp with prepared message
        window.open(`https://wa.me/6285643848251?text=${message}`, '_blank');

        // Navigate to success page
        navigate('/', {
          state: {
            campaign: campaignTitle,
            amount: amount,
            date: new Date().toISOString(),
          },
        });
      } else {
        alert('Gagal membuat donasi. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error creating donation:', error);
      alert('Terjadi kesalahan saat membuat donasi.');
    }
  };

  return (
    <div className="body">
      <Header />
      <div className="container">
        {/* Thank you message */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-gray-700">
            Terimakasih, <span className="text-green-600">{donorName}</span>
          </h1>
          <p className="text-gray-600">
            atas Donasi yang akan anda berikan pada program :
          </p>
          <h2 className="text-2xl font-bold mt-2 mb-6">{campaignTitle}</h2>
        </div>

        {/* Payment Card Section */}
        {paymentConfig?.active_mode === 'dynaqris' ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-6 border border-emerald-100 p-6 text-center space-y-5">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-icons text-base">qr_code_2</span>
              <span>Pembayaran QRIS</span>
            </div>
            
            <div>
              <h3 className="text-xl font-black text-gray-800">Scan QRIS Untuk Melengkapi Donasi</h3>
              <p className="text-xs text-gray-500 mt-1">Buka BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking Anda</p>
            </div>

            {/* Total Nominal Box */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-4 text-center max-w-sm mx-auto shadow-lg">
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-100">Total Nominal Donasi</p>
              <h2 className="text-3xl font-black mt-1">
                Rp {new Intl.NumberFormat('id-ID').format(qrisData?.amount || amount || 0)}
              </h2>
              <p className="text-[11px] text-emerald-100/90 mt-1 font-medium">Nominal otomatis terdeteksi saat di-scan</p>
            </div>

            {/* QR Image */}
            <div className="flex justify-center py-2">
              {isExpired ? (
                <div className="w-64 h-64 bg-gray-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-300">
                  <span className="material-icons text-4xl text-red-500 mb-2">timer_off</span>
                  <p className="font-bold text-red-600 text-sm">Waktu Pembayaran Habis</p>
                  <p className="text-xs text-gray-500 mt-1">Silakan lakukan donasi ulang untuk mendapatkan QRIS baru.</p>
                </div>
              ) : qrisData?.qrisImage ? (
                <div className="p-3 bg-white border-2 border-emerald-500/20 rounded-2xl shadow-md">
                  <img src={qrisData.qrisImage} alt="QRIS Code" className="w-64 h-64 object-contain rounded-xl" />
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 text-xs font-bold gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{generatingQris ? 'Membuat QRIS...' : 'Mempersiapkan QRIS...'}</span>
                </div>
              )}
            </div>

            {/* Countdown Timer */}
            {!isExpired && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 max-w-sm mx-auto">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-amber-600 text-lg animate-pulse">alarm</span>
                  <span className="text-xs font-bold text-amber-800">Sisa Waktu Pembayaran:</span>
                </div>
                <span className={`font-mono text-base font-black ${timeLeft < 120 ? 'text-red-600 animate-bounce' : 'text-amber-700'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}

            {/* Action & Status Check Button */}
            <div className="max-w-sm mx-auto space-y-2">
              {!isExpired && (
                <button
                  type="button"
                  onClick={handleManualCheckStatus}
                  disabled={checkingStatus}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-lg">check_circle</span>
                      <span>Saya Sudah Bayar / Cek Status</span>
                    </>
                  )}
                </button>
              )}

              {qrisData?.qrisCode && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(qrisData.qrisCode, 'Kode QRIS')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <span className="material-icons text-sm">content_copy</span>
                  <span>Salin Text Kode QRIS</span>
                </button>
              )}

              <p className="text-xs text-gray-500 font-medium pt-1">
                {statusText}
              </p>
            </div>
          </div>
        ) : (
          /* Manual Bank Transfer Option */
          <>
            {/* Bank information card */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="p-4 flex flex-col items-center">
                <div className="flex items-center w-full mb-4">
                  <img
                    src={`/images/${bank}-logo.png`}
                    alt={selectedBankInfo.name}
                    className="w-12 mr-2"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">{selectedBankInfo.number}</h3>
                      {!selectedBankInfo.isQRIS && (
                        <button
                          onClick={() => copyToClipboard(selectedBankInfo.number, 'Nomor rekening')}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Salin No Rek.
                        </button>
                      )}
                    </div>
                    <p className="text-gray-600">
                      {selectedBankInfo.isQRIS ? 'Scan QRIS untuk pembayaran' : `a.n. ${selectedBankInfo.owner || 'Barakah Economy Community'}`}
                    </p>
                  </div>
                </div>

                {selectedBankInfo.isQRIS && (
                  <div className="w-full flex justify-center p-4 bg-gray-50 rounded-lg">
                    <img
                      src="/images/qris-bae2.png"
                      alt="QRIS BAE"
                      className="max-w-xs w-full shadow-sm rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Amount card */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <div className="p-4">
                <div className="flex items-center mb-2">
                  <div className="flex-1 flex justify-between items-center">
                    <h3 className="text-2xl font-bold">
                      Rp. <span className="text-green-500">{formattedAmount}</span>
                    </h3>
                    <button
                      onClick={() => copyToClipboard(amount, 'Nominal')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Salin Nominal
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-100 text-yellow-800 py-2 px-3 rounded-lg text-sm font-medium">
                  PENTING! Mohon transfer sesuai sampai dengan 3 digit terakhir
                </div>
              </div>
            </div>

            {/* Payment confirmation form */}
            <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
              <div className="p-4">
                <h3 className="text-xl font-bold mb-4">Konfirmasi Pembayaran Transfer Bank</h3>

                <form onSubmit={handleSubmit} className="space-y-4 mb-10">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Transfer dari <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="sourceBank"
                      placeholder="Nama Bank Pengirim"
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none mb-2"
                      value={formData.sourceBank}
                      onChange={handleInputChange}
                      required
                    />
                    {!selectedBankInfo.isQRIS && (
                      <input
                        type="text"
                        name="sourceAccount"
                        placeholder="Nomor Rekening Pengirim"
                        className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none mb-2"
                        value={formData.sourceAccount}
                        onChange={handleInputChange}
                        required
                      />
                    )}
                    <input
                      type="text"
                      name="accountName"
                      placeholder="Atas Nama (opsional)"
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none mb-2"
                      value={formData.accountName || ''}
                      onChange={handleInputChange}
                    />

                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Transfer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="transferDate"
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                      value={formData.transferDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bukti Transfer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
                      required
                    />
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current.click()}
                    >
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Bukti Transfer"
                            className="max-h-48 mx-auto rounded-lg"
                          />
                          <div className="mt-2 text-sm text-green-600">Klik untuk mengganti</div>
                        </div>
                      ) : (
                        <div className="py-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500">Pilih File</p>
                          <p className="text-xs text-gray-400">JPG, PNG, JPEG</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 mt-4 bg-yellow-50 p-3 rounded-lg text-sm border border-yellow-200">
                    <p className="text-yellow-800">
                      <strong>Catatan:</strong> Setelah klik KIRIM, Anda akan diarahkan ke WhatsApp untuk mengirim konfirmasi kepada admin. Mohon lampirkan juga bukti transfer di chat WhatsApp.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                  >
                    KIRIM VIA WHATSAPP
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
      <NavigationButton />
    </div>
  );
};

export default CrowdfundingPaymentConfirmation;