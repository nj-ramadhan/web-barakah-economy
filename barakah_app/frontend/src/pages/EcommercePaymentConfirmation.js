// pages/EcommercePaymentConfirmation.js
import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Tesseract from 'tesseract.js';
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

const EcommercePaymentConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Redirect if no data passed
  if (!location.state) {
    navigate('/');
    return null;
  }

  const {
    amount,
    bank,
    customerName,
    customerPhone,
    shippingCost,
    courier,
    voucherCode,
    voucherDiscount
  } = location.state;

  const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);

  const bankAccounts = {
    bsi: {
      name: 'bsi',
      number: '1040 4974 08',
      fullName: 'Bank Syariah Indonesia',
      owner: 'DENY SETIAWAN'
    },
    bjb: {
      name: 'bjb',
      number: '5130 1020 01161',
      fullName: 'Bank Jabar Banten Syariah',
      owner: 'DENY SETIAWAN'
    },
    qris: {
      name: 'qris',
      number: 'QRIS BAE COMMUNITY',
      fullName: 'QRIS',
      owner: 'BAE COMMUNITY, DIGITAL & KREATIF',
      isQRIS: true
    }
  };

  const selectedBankInfo = bankAccounts[bank];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal 5MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Format file tidak didukung. Hanya JPG, PNG, dan JPEG yang diperbolehkan.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrError('');
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
      .then(() => alert(`${type} berhasil disalin!`))
      .catch(err => console.error('Failed to copy: ', err));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Mohon upload bukti transfer');
      return;
    }

    setUploading(true);
    setOcrLoading(true);
    setOcrError('');

    try {
      // --- OCR VALIDATION ---
      console.log("Starting OCR processing...");
      const { data: { text } } = await Tesseract.recognize(selectedFile, 'ind');
      const lowerText = text.toLowerCase();
      console.log("OCR Result:", text);

      const isBaeCommunityPresent = lowerText.includes('bae community');
      const isDenySetiawanPresent = lowerText.includes('deny setiawan');

      const numericTotal = Math.floor(Number(amount));
      const totalStr = String(numericTotal);
      const totalFormatted = numericTotal.toLocaleString('id-ID');
      const scrubbedText = lowerText.replace(/rp/g, '').replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, '');

      const isAmountPresent = 
        text.includes(totalStr) || 
        text.includes(totalFormatted) || 
        scrubbedText.includes(totalStr);

      if (!isBaeCommunityPresent && !isDenySetiawanPresent) {
        setOcrError('Validasi Gagal: Struk tidak mencantumkan nama "BAE Community" atau "DENY SETIAWAN". Pastikan Anda transfer ke rekening yang benar.');
        setUploading(false);
        setOcrLoading(false);
        return;
      }

      if (!isAmountPresent) {
        setOcrError(`Validasi Gagal: Nominal struk tidak sesuai dengan total tagihan (Rp ${totalFormatted}).`);
        setUploading(false);
        setOcrLoading(false);
        return;
      }
      // --- END OCR ---

      const csrfToken = getCsrfToken();
      const paymentData = new FormData();
      paymentData.append('amount', amount);
      paymentData.append('customer_name', customerName);
      paymentData.append('customer_phone', customerPhone);
      paymentData.append('payment_method', selectedBankInfo.name);
      paymentData.append('transfer_date', new Date().toISOString().split('T')[0]);
      paymentData.append('proof_file', selectedFile);
      paymentData.append('shipping_cost', shippingCost || 0);
      paymentData.append('shipping_courier', courier || '');
      paymentData.append('voucher_code', voucherCode || '');
      paymentData.append('voucher_nominal', voucherDiscount || 0);

      const userData = localStorage.getItem('user');
      let authToken = null;
      if (userData) {
        authToken = JSON.parse(userData).access;
      }

      const headers = {
        'Content-Type': 'multipart/form-data',
        'X-CSRFToken': csrfToken,
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/orders/create-order/`,
        paymentData,
        { headers }
      );

      if (response.status === 201) {
        setOrderNumber(response.data[0]?.order_number || 'N/A');
        setIsSuccess(true);
      } else {
        alert('Gagal mengkonfirmasi pembayaran. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error confirming payment:', error.response?.data || error.message);
      setOcrError('Terjadi kesalahan saat memproses. Silakan pastikan gambar struk terbaca jelas.');
    } finally {
      setUploading(false);
      setOcrLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="body">
        <Header />
        <div className="container px-4 py-12 text-center h-[80vh] flex flex-col justify-center items-center">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl border border-white/20 w-full max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100 animate-bounce">
                    <span className="material-icons text-white text-5xl">check_circle</span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Terima Kasih!</h1>
                <p className="text-emerald-600 font-bold mb-6 italic">Pembayaran Anda Telah Diverifikasi Otomatis</p>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left border border-gray-100">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Order ID</span>
                        <span className="text-gray-900 font-mono font-bold">#{orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Bayar</span>
                        <span className="text-gray-900 font-bold font-mono">Rp {formattedAmount}</span>
                    </div>
                </div>

                <p className="text-gray-500 text-sm mb-10 leading-relaxed">
                    Nota bukti pembelian telah dikirim ke WhatsApp Anda. Penjual juga telah mendapatkan notifikasi untuk segera memproses pesanan Anda.
                </p>

                <button
                    onClick={() => navigate('/riwayat-belanja')}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Lihat Status Pesanan
                </button>
                
                <button
                    onClick={() => navigate('/sinergy')}
                    className="mt-4 w-full py-2 text-gray-400 font-bold text-sm hover:text-emerald-600 transition-colors"
                >
                    Kembali ke Sinergy
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      <Header />
      <div className="container max-w-lg mb-20 px-4">
        {/* Header Section */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Konfirmasi Pembayaran</h1>
          <p className="text-gray-500 text-sm">Upload struk untuk verifikasi otomatis via <span className="text-emerald-600 font-bold">OCR AI</span></p>
        </div>

        {/* Bank Card */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 p-6 mb-6 border border-gray-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border border-gray-100">
                <img src={`/images/${bank}-logo.png`} alt={bank} className="max-w-full" />
            </div>
            <div>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">{selectedBankInfo.fullName}</p>
                <h3 className="text-xl font-black text-gray-900">{selectedBankInfo.number}</h3>
                <p className="text-xs text-gray-400 font-bold">a.n. {selectedBankInfo.owner}</p>
            </div>
          </div>
          
          <button 
            onClick={() => copyToClipboard(selectedBankInfo.number, 'Nomor rekening')}
            className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-icons text-sm">content_copy</span> SALIN NOMOR REKENING
          </button>
        </div>

        {/* Amount Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[32px] p-6 mb-8 shadow-xl shadow-emerald-100">
            <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Tagihan</p>
            <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black text-white tracking-tight">Rp {formattedAmount}</h2>
                <button 
                    onClick={() => copyToClipboard(amount, 'Nominal')}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                    <span className="material-icons text-sm">content_copy</span>
                </button>
            </div>
        </div>

        {/* QRIS if selected */}
        {selectedBankInfo.isQRIS && (
            <div className="bg-white rounded-[32px] p-6 mb-8 border-2 border-dashed border-emerald-100 flex flex-col items-center">
                <img src="/images/qris-bae2.png" alt="QRIS" className="w-full max-w-[240px] mb-4" />
                <a href="/images/qris-bae2.png" download className="text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">Unduh QRIS</a>
            </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div 
                className={`relative border-3 border-dashed rounded-[32px] p-8 text-center transition-all cursor-pointer ${
                    previewUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                }`}
                onClick={() => fileInputRef.current.click()}
            >
                {previewUrl ? (
                    <div className="relative group">
                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-2xl shadow-lg shadow-emerald-200/50" />
                        <div className="absolute inset-0 bg-emerald-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-white font-black text-sm">GANTI FOTO</span>
                        </div>
                    </div>
                ) : (
                    <div className="py-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-emerald-600 text-3xl">cloud_upload</span>
                        </div>
                        <p className="text-gray-900 font-black text-base">Upload Struk Pembayaran</p>
                        <p className="text-gray-400 text-xs mt-1 font-bold">Pastikan gambar terang dan nominal terbaca</p>
                    </div>
                )}
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
            </div>

            {ocrError && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                    <span className="material-icons text-red-600">error_outline</span>
                    <div>
                        <p className="text-red-700 font-black text-xs uppercase tracking-widest mb-1">Validasi Gagal</p>
                        <p className="text-red-600 text-[11px] leading-relaxed font-bold">{ocrError}</p>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={uploading || !selectedFile}
                className={`w-full py-5 rounded-[24px] font-black text-base tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${
                    uploading 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-1'
                }`}
            >
                {uploading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                        <span className="animate-pulse">{ocrLoading ? 'MEMINDAI STRUK...' : 'MEMPROSES...'}</span>
                    </>
                ) : (
                    <>KONFIRMASI SEKARANG</>
                )}
            </button>
            
            <p className="text-center text-[10px] text-gray-400 font-bold italic">
                *Sistem AI akan memvalidasi pembayaran Anda dalam hitungan detik.
            </p>
        </form>
      </div>
      <NavigationButton />
    </div>
  );
};

export default EcommercePaymentConfirmation;