// pages/CrowdfundingPaymentConfirmation.js
import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [formData, setFormData] = useState({
    accountName: '',
    sourceBank: '',
    sourceAccount: '',
    transferDate: new Date().toISOString().split('T')[0],
    amount: location.state?.amount || 0
  });

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
    campaignSlug // Extract campaign slug
  } = location.state;

  // Format amount with dot thousand separator
  const formattedAmount = new Intl.NumberFormat('id-ID').format(amount);
  
  // Bank account info based on selected bank
  const bankAccounts = {
    bsi: {
      name: 'bsi',
      number: '1040 4974 08',
      fullName: 'Bank Syariah Indonesia'
    },
    bjb: {
      name: 'bjb',
      number: '5130 1020 01161',
      fullName: 'Bank Jabar Banten Syariah'
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
      if (file.size > 2 * 1024 * 1024) { // Limit file size to 5MB
        alert('Ukuran file terlalu besar. Maksimal 2MB.');
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
  
    if (!formData.sourceBank || !formData.sourceAccount || !formData.transferDate) {
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
    
    const message = `*Donasi BAE Community*%0A
------------------------------------%0A
Bismillah..%0A
Pada hari ini,%0A 
Tanggal ${formatDate(formData.transferDate)}%0A
Saya ${formData.accountName || ''} berniat menitipkan donasi pada program ${campaignTitle}%0A
dengan nominal Rp ${formattedAmount} melalui Bank ${selectedBankInfo.fullName}%0A
%0A
Saya mengirim donasi dari Bank ${formData.sourceBank}, dengan No. Rekening ${formData.sourceAccount}%0A
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

        {/* Bank information card */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 flex items-center">
            <img 
              src={`/images/${bank}-logo.png`}
              alt={selectedBankInfo.name}
              className="w-12 mr-2"
            />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedBankInfo.number}</h3>
                <button 
                  onClick={() => copyToClipboard(selectedBankInfo.number, 'Nomor rekening')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Salin No Rek.
                </button>
              </div>
              <p className="text-gray-600">a.n. Deny Setiawan</p>
            </div>
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
            <h3 className="text-xl font-bold mb-4">Konfirmasi Pembayaran</h3>
            
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
                <input
                    type="text"
                    name="sourceAccount"
                    placeholder="Nomor Rekening Pengirim"
                    className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none mb-2"
                    value={formData.sourceAccount}
                    onChange={handleInputChange}
                    required
                />
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
      </div>
      <NavigationButton />
    </div>
  );
};

export default CrowdfundingPaymentConfirmation;