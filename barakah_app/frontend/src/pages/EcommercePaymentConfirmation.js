import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import DynaQRISModal from '../components/common/DynaQRISModal';
import { getPublicPaymentConfig, generateDynaQRIS } from '../services/paymentApi';
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
  const params = useParams();
  const fileInputRef = useRef(null);

  const [orderData, setOrderData] = useState(location.state || null);
  const [loadingOrder, setLoadingOrder] = useState(!location.state);

  const urlOrderNumber = params.orderNumber || new URLSearchParams(location.search).get('order_number') || new URLSearchParams(location.search).get('order_id');
  const currentOrderNumber = orderData?.orderNumber || orderData?.orderId || urlOrderNumber || '';

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // DynaQRIS State
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [showDynaModal, setShowDynaModal] = useState(false);
  const [qrisData, setQrisData] = useState(null);
  const [generatingQris, setGeneratingQris] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isExpired, setIsExpired] = useState(false);

  // Fetch order data if accessed directly via URL or profile without state
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (orderData && orderData.amount) {
        setLoadingOrder(false);
        return;
      }

      const targetId = urlOrderNumber || currentOrderNumber;
      if (!targetId) {
        setLoadingOrder(false);
        navigate('/riwayat-belanja');
        return;
      }

      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          navigate('/login');
          return;
        }
        const user = JSON.parse(userData);
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
          headers: { Authorization: `Bearer ${user.access}` }
        });

        const matched = (res.data || []).find(o => 
          String(o.order_number) === String(targetId) || 
          String(o.id) === String(targetId)
        );

        if (matched) {
          const calculatedTotal = Number(matched.grand_total) > 0 ? Number(matched.grand_total) : Number(matched.total_price);
          setOrderData({
            orderId: matched.id,
            orderNumber: matched.order_number,
            amount: calculatedTotal,
            baseAmount: Number(matched.total_price) + Number(matched.shipping_cost || 0) - Number(matched.voucher_nominal || 0),
            uniqueFee: Number(matched.admin_fee || 0),
            bank: matched.payment_method === 'dynaqris' ? 'qris' : (matched.payment_method || 'qris'),
            customerName: matched.recipient_name,
            customerPhone: matched.recipient_phone,
            shippingCost: matched.shipping_cost,
            courier: matched.shipping_courier,
            voucherCode: matched.voucher_code,
            voucherDiscount: matched.voucher_nominal,
            cartItems: (matched.items || []).map(it => ({
              product: {
                title: it.product_name,
                price: it.price,
                thumbnail: it.product_thumbnail || it.product_image
              },
              quantity: it.quantity,
              price: it.price
            }))
          });
        } else {
          alert('Data pesanan tidak ditemukan.');
          navigate('/riwayat-belanja');
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        navigate('/riwayat-belanja');
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [urlOrderNumber]);

  useEffect(() => {
    getPublicPaymentConfig().then((cfg) => {
      setPaymentConfig(cfg);
      if (cfg?.active_mode === 'dynaqris' && orderData?.amount) {
        handleGenerateDynaQRIS(false, cfg);
      }
    }).catch(err => console.error("Error fetching config:", err));
  }, [orderData?.amount]);

  // Countdown timer for DynaQRIS
  useEffect(() => {
    if (paymentConfig?.active_mode === 'dynaqris' && qrisData && !isSuccess && !isExpired) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentConfig, qrisData, isSuccess, isExpired]);

  // Auto-polling payment status for instant seamless verification
  useEffect(() => {
    if (paymentConfig?.active_mode === 'dynaqris' && qrisData && !isSuccess) {
      const poller = setInterval(async () => {
        try {
          const userData = localStorage.getItem('user');
          if (!userData) return;
          const user = JSON.parse(userData);
          const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
            headers: { Authorization: `Bearer ${user.access}` }
          });
          const matched = (res.data || []).find(o => 
            String(o.order_number) === String(currentOrderNumber) || 
            String(o.id) === String(currentOrderNumber)
          );
          if (matched && ['paid', 'proses', 'dikirim', 'selesai'].includes((matched.status || '').toLowerCase())) {
            clearInterval(poller);
            handleDynaSuccess(matched);
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 3000);
      return () => clearInterval(poller);
    }
  }, [paymentConfig, qrisData, isSuccess, currentOrderNumber]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleDownloadQRIS = () => {
    if (!qrisData?.qrisImage && !qrisData?.qrisCode) return;
    const imgUrl = qrisData.qrisImage || `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrisData.qrisCode)}`;
    
    if (imgUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `QRIS-Barakah-${currentOrderNumber || 'bayar'}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `QRIS-Barakah-${currentOrderNumber || 'bayar'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
          window.open(imgUrl, '_blank');
        });
    }
  };

  const handleGenerateDynaQRIS = async (forceRegenerate = false, cfg = paymentConfig) => {
    if (qrisData && !forceRegenerate && !isExpired) {
      setShowDynaModal(true);
      return;
    }
    const targetAmount = orderData?.baseAmount || orderData?.amount;
    if (!targetAmount) return;

    setGeneratingQris(true);
    setIsExpired(false);
    try {
      const res = await generateDynaQRIS({ 
        amount: targetAmount, 
        reference_id: currentOrderNumber, 
        type: 'ecommerce',
        add_unique_code: orderData?.addUniqueCode !== false
      });
      if (res.error) {
        alert(res.error);
      } else {
        setQrisData(res);
        setTimeLeft(res.timeoutSeconds || 300);
        setIsExpired(false);
        setShowDynaModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan QRIS Dinamis.');
    } finally {
      setGeneratingQris(false);
    }
  };

  const handleDynaCancel = () => {
    setShowDynaModal(false);
    alert('Sesi pembayaran ditutup. Anda dapat membayar kembali kapan saja melalui menu Profil / Riwayat Belanja.');
    navigate('/riwayat-belanja');
  };

  const handleDynaSuccess = async (res) => {
    setShowDynaModal(false);
    setOrderNumber(currentOrderNumber || res?.order_number || res?.order_id || 'N/A');
    setIsSuccess(true);

    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.access) {
          await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/cart/clear/`, {
            headers: { Authorization: `Bearer ${user.access}` }
          });
        }
      }
    } catch (err) {
      console.error('Error clearing cart after DynaQRIS payment:', err);
    }
  };

  // Final amount syncs with DynaQRIS total (including unique fee / admin fee)
  const isDynaActive = paymentConfig?.active_mode === 'dynaqris';
  const amount = orderData?.amount || 0;
  const bank = orderData?.bank || 'qris';
  const customerName = orderData?.customerName || '';
  const customerPhone = orderData?.customerPhone || '';
  const shippingCost = orderData?.shippingCost || 0;
  const courier = orderData?.courier || '';
  const voucherCode = orderData?.voucherCode || '';
  const voucherDiscount = orderData?.voucherDiscount || 0;
  const cartItems = orderData?.cartItems || [];

  const finalDisplayAmount = qrisData?.amount || amount || 0;
  const dynaAdminFee = Number(orderData?.uniqueFee) || (qrisData?.amount && qrisData.amount > amount ? (qrisData.amount - amount) : (qrisData?.uniqueCode || 0));
  const baseTagihanAmount = Number(orderData?.baseAmount) || (amount - dynaAdminFee);
  const formattedAmount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(finalDisplayAmount || 0);
  const formattedBaseAmount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(baseTagihanAmount || 0);


  const getMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL || ''}${url}`;
  };

  const firstProduct = cartItems[0]?.product;
  const isDirect = firstProduct && firstProduct.own_bank_status === 'approved';

  const bankAccounts = {
    bsi: {
      name: isDirect && firstProduct.own_bank_name ? firstProduct.own_bank_name.toLowerCase() : 'bsi',
      number: isDirect ? firstProduct.own_bank_account : '2220606662',
      fullName: isDirect ? firstProduct.own_bank_name : 'Bank Syariah Indonesia',
      owner: isDirect ? firstProduct.own_bank_holder : 'Barakah Economy Community'
    },
    qris: {
      name: 'qris',
      number: isDirect ? `QRIS ${firstProduct.own_bank_holder}` : 'QRIS BAE COMMUNITY',
      fullName: 'QRIS',
      owner: isDirect ? firstProduct.own_bank_holder : 'BAE COMMUNITY',
      logo: isDirect && firstProduct.own_qris_image ? getMediaUrl(firstProduct.own_qris_image) : '/images/qris-bae2.png',
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

  const preprocessImageForOCR = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Lightweight grayscale enhancement for clearer OCR text
            const imgData = ctx.getImageData(0, 0, width, height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const avg = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
              d[i] = avg;
              d[i + 1] = avg;
              d[i + 2] = avg;
            }
            ctx.putImageData(imgData, 0, 0);

            canvas.toBlob((blob) => {
              resolve(blob || file);
            }, 'image/jpeg', 0.85);
          } catch (err) {
            console.warn("Canvas preprocessing fallback to original:", err);
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
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

    let ocrFailedReason = '';

    try {
      // --- OCR VALIDATION WITH MOBILE DOWNSCALING ---
      console.log("Pre-processing image for mobile-friendly OCR...");
      const optimizedBlob = await preprocessImageForOCR(selectedFile);

      try {
        const { data: { text } } = await Tesseract.recognize(optimizedBlob, 'ind', {
          logger: (m) => console.log(m)
        });
        const lowerText = (text || '').toLowerCase();
        console.log("OCR Result Text:", text);

        const numericTotal = Math.floor(Number(amount || 0));
        const totalStr = String(numericTotal);
        const totalFormatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(numericTotal);

        const cleanOcrText = (text || '').replace(/[\.,]00\b/g, '').replace(/rp/gi, '');
        const scrubbedOCR = cleanOcrText.replace(/[^0-9]/g, '');

        const isAmountPresent =
            (text && text.includes(totalStr)) ||
            (text && text.includes(totalFormatted)) ||
            scrubbedOCR.includes(totalStr);

        let isRecipientValid = false;
        let expectedRecipientName = 'BAE Community / Barakah Economy';
        if (isDirect && firstProduct?.own_bank_holder) {
          expectedRecipientName = firstProduct.own_bank_holder;
          isRecipientValid = lowerText.includes(firstProduct.own_bank_holder.toLowerCase());
        } else {
          isRecipientValid = lowerText.includes('bae community') || lowerText.includes('barakah economy') || lowerText.includes('gopay') || lowerText.includes('barakah') || lowerText.includes('qris');
        }

        if (!isRecipientValid) {
          ocrFailedReason = `Validasi Gagal: Struk tidak mencantumkan nama "${expectedRecipientName}". Pastikan Anda transfer ke rekening/QRIS yang benar.`;
        } else if (!isAmountPresent) {
          ocrFailedReason = `Validasi Gagal: Nominal struk tidak sesuai dengan total tagihan (Rp ${totalFormatted}).`;
        }
      } catch (tesseractErr) {
        console.warn("Mobile Tesseract WebAssembly constraint, gracefully allowing submission with proof file:", tesseractErr);
        // On mobile environments where WebAssembly fails, pass through to let server/seller verify
      }

      if (ocrFailedReason) {
        setOcrError(ocrFailedReason);
        setUploading(false);
        setOcrLoading(false);
        return;
      }
      // --- END OCR ---

      const csrfToken = getCsrfToken();
      const paymentData = new FormData();
      if (orderId) paymentData.append('order_id', orderId);
      if (orderNumberParam) paymentData.append('order_number', orderNumberParam);
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
      paymentData.append('admin_fee', uniqueFee || dynaAdminFee || 0);

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
      setOcrError(error.response?.data?.message || 'Terjadi kesalahan saat memproses. Silakan periksa kembali foto struk Anda.');
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
              onClick={() => navigate('/store')}
              className="mt-4 w-full py-2 text-gray-400 font-bold text-sm hover:text-emerald-600 transition-colors"
            >
              Kembali ke E-commerce
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
          <p className="text-gray-500 text-sm">
            {paymentConfig?.active_mode === 'dynaqris'
              ? 'Pembayaran Otomatis Menggunakan QRIS'
              : 'Upload struk untuk verifikasi otomatis via OCR AI'}
          </p>
        </div>

        {/* IF DYNAQRIS MODE: RENDER DIRECT FULL-PAGE QRIS UI */}
        {paymentConfig?.active_mode === 'dynaqris' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 p-6 border border-gray-100 text-center space-y-5">
              {/* Header instructions */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-1 border border-emerald-100">
                  <span className="material-icons text-sm">qr_code_2</span>
                  <span>Pembayaran QRIS Dinamis</span>
                </div>
                <h3 className="text-xl font-black text-gray-900">Scan untuk Membayar</h3>
                <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
                  Buka BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking Anda
                </p>
              </div>

              {/* Total Amount Green Box */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-100 space-y-1">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-100">Total Nominal Pembayaran</p>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-3xl font-black tracking-tight font-mono">Rp {formattedAmount}</h2>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(finalDisplayAmount, 'Nominal Pembayaran')}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition text-white"
                    title="Salin Nominal"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-100 font-bold">*Nominal pas otomatis terdeteksi saat di-scan</p>

                {dynaAdminFee > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/20 flex justify-between items-center text-xs text-emerald-100">
                    <span>Tagihan Pokok: Rp {formattedBaseAmount}</span>
                    <span className="text-amber-200 font-bold">Biaya Admin: +Rp {new Intl.NumberFormat('id-ID').format(dynaAdminFee)}</span>
                  </div>
                )}
              </div>

              {/* QR Image Box */}
              <div className="bg-emerald-50/50 p-6 rounded-3xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center min-h-[260px]">
                {generatingQris ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-gray-600">Menghasilkan QRIS Dinamis...</p>
                  </div>
                ) : isExpired ? (
                  <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-red-300 text-center space-y-3 w-full max-w-sm">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <span className="material-icons text-2xl">timer_off</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-red-700">Sesi QRIS Telah Berakhir</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Pesanan Anda tetap tersimpan. Klik tombol di bawah untuk memperbarui kode QRIS dengan nominal yang sama.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateDynaQRIS(true)}
                      disabled={generatingQris}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition"
                    >
                      <span className="material-icons text-sm">refresh</span>
                      <span>Buat Ulang QRIS / Bayar Lagi</span>
                    </button>
                  </div>
                ) : qrisData?.qrisImage || qrisData?.qrisCode ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 inline-block">
                      <img 
                        src={qrisData.qrisImage || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisData.qrisCode)}`} 
                        alt="QRIS Dinamis" 
                        className="w-56 h-56 object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadQRIS}
                        className="text-xs text-emerald-800 font-bold bg-emerald-100/80 hover:bg-emerald-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-icons text-sm">file_download</span>
                        <span>Unduh Gambar QRIS</span>
                      </button>
                      {qrisData?.qrisCode && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(qrisData.qrisCode, 'Text Kode QRIS')}
                          className="text-xs text-gray-700 font-bold bg-white px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-icons text-sm">content_copy</span>
                          <span>Salin Text QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center py-6">
                    <span className="material-icons text-4xl text-gray-400">qr_code</span>
                    <p className="text-xs text-gray-500 font-medium">QRIS belum termuat.</p>
                    <button
                      type="button"
                      onClick={() => handleGenerateDynaQRIS()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                      Muat Ulang QRIS
                    </button>
                  </div>
                )}
              </div>

              {/* Countdown Timer & Real-time Auto-Detection status */}
              {qrisData && !isExpired && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-100 text-amber-900 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-amber-600 text-base animate-pulse">timer</span>
                      <span>Sisa Waktu Pembayaran:</span>
                    </div>
                    <span className="font-mono text-base font-black text-amber-700 tracking-wider">{formatCountdown(timeLeft)}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-emerald-50/70 border border-emerald-100/80 rounded-xl text-[11px] text-emerald-800 font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span>Sistem mengecek status pembayaran otomatis setiap 3 detik...</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('user'))?.access}` }
                      });
                      const matched = (res.data || []).find(o => String(o.order_number) === String(currentOrderNumber) || String(o.id) === String(currentOrderNumber));
                      if (matched && ['paid', 'proses', 'dikirim', 'selesai'].includes((matched.status || '').toLowerCase())) {
                        alert('Pembayaran terverifikasi! Terima kasih.');
                        navigate('/riwayat-belanja');
                      } else {
                        alert('Pembayaran belum terdeteksi. Harap pastikan transfer sudah berhasil dilakukan.');
                      }
                    } catch (e) {
                      alert('Sedang mengecek status pesanan...');
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-200 hover:scale-[1.01] transition flex items-center justify-center gap-2"
                >
                  <span className="material-icons text-base">check_circle</span>
                  <span>Saya Sudah Bayar / Cek Status</span>
                </button>

                <button
                  type="button"
                  onClick={handleDynaCancel}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span className="material-icons text-sm text-red-500">cancel</span>
                  <span>Batalkan Pembayaran</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MANUAL BANK TRANSFER & RECEIPT UPLOAD MODE */
          <>
            {/* Bank Card */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 p-6 mb-6 border border-gray-50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border border-gray-100">
                  {isDirect && bank !== 'qris' ? (
                    <span className="material-icons text-3xl text-emerald-600">account_balance</span>
                  ) : (
                    <img src={`/images/${bank}-logo.png`} alt={bank} className="max-w-full" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  )}
                  <span className="material-icons text-3xl text-emerald-600 hidden">account_balance</span>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">{selectedBankInfo.fullName}</p>
                  <h3 className="text-xl font-black text-gray-900">{selectedBankInfo.number}</h3>
                  <p className="text-xs text-gray-400 font-bold">a.n. {selectedBankInfo.owner}</p>
                </div>
              </div>

              {!selectedBankInfo?.isQRIS && bank !== 'qris' && (
                <button
                  onClick={() => copyToClipboard(selectedBankInfo.number, 'Nomor rekening')}
                  className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons text-sm">content_copy</span> SALIN NOMOR REKENING
                </button>
              )}
            </div>

            {/* Amount Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[32px] p-6 mb-8 shadow-xl shadow-emerald-100">
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Tagihan Pembayaran</p>
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black text-white tracking-tight">Rp {formattedAmount}</h2>
                <button
                  onClick={() => copyToClipboard(finalDisplayAmount, 'Nominal Total Tagihan')}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                  title="Salin Nominal Pembayaran"
                >
                  <span className="material-icons text-sm">content_copy</span>
                </button>
              </div>

              {Number(voucherDiscount) > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-emerald-100 font-bold">
                  <span>Potongan Voucher {voucherCode ? `(${voucherCode})` : ''}</span>
                  <span>- Rp {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(voucherDiscount)}</span>
                </div>
              )}
            </div>

            {/* QRIS if selected */}
            {selectedBankInfo.isQRIS && (
              <div className="bg-white rounded-[32px] p-6 mb-8 border-2 border-dashed border-emerald-100 flex flex-col items-center">
                <img src={selectedBankInfo.logo || "/images/qris-bae2.png"} alt="QRIS" className="w-full max-w-[240px] mb-4" />
                <a href={selectedBankInfo.logo || "/images/qris-bae2.png"} download className="text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">Unduh QRIS</a>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                className={`relative border-3 border-dashed rounded-[32px] p-8 text-center transition-all cursor-pointer ${previewUrl ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                onClick={() => fileInputRef.current.click()}
              >
                {previewUrl ? (
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      alt="Preview Struk"
                      className="max-h-64 mx-auto rounded-2xl shadow-md object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white text-xs font-bold">
                      Klik untuk ganti gambar
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
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {ocrError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3">
                  <span className="material-icons text-red-500 text-sm mt-0.5">error</span>
                  <div>
                    <p className="font-bold">Gagal Verifikasi Otomatis</p>
                    <p className="mt-0.5">{ocrError}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedFile || uploading || ocrLoading}
                className={`w-full py-5 rounded-[24px] font-black text-base tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${!selectedFile || uploading || ocrLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-1'
                  }`}
              >
                {ocrLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    <span>MEMVALIDASI STRUK...</span>
                  </>
                ) : uploading ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    <span>MENGIRIM...</span>
                  </>
                ) : (
                  <span>KONFIRMASI SEKARANG</span>
                )}
              </button>
              <p className="text-center text-[10px] text-gray-400 font-bold italic">
                *Sistem AI akan memvalidasi pembayaran Anda dalam hitungan detik.
              </p>
            </form>
          </>
        )}
      </div>
      <NavigationButton />
    </div>
  );
};

export default EcommercePaymentConfirmation;