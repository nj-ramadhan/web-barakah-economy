import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../services/auth';
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

const formatDate = (dateStr) => {
  if (!dateStr) return 'tidak ada';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatIDR = (amount) => {
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const bankAccounts = {
  bsi: {
    name: 'bsi',
    number: '1040 4974 08',
    fullName: 'Bank Syariah Indonesia',
    logo: '/images/bsi-logo.png',
    owner: 'Deny Setiawan',
  },
  bjb: {
    name: 'bjb',
    number: '5130 1020 01161',
    fullName: 'Bank Jabar Banten Syariah',
    logo: '/images/bjb-logo.png',
    owner: 'Deny Setiawan',
  },
};

const EcoursePaymentConfirmation = () => {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [profile, setProfile] = useState({ name_full: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [formData, setFormData] = useState({
    accountName: '',
    sourceBank: '',
    sourceAccount: '',
    transferDate: new Date().toISOString().split('T')[0],
  });
  const [selectedBank, setSelectedBank] = useState('bsi');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // Fetch course on slug change
  useEffect(() => {
    const fetchCourse = async () => {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/?slug=${slug}`);
      setCourse(res.data[0]);
    };
    fetchCourse();
  }, [slug]);

  // Fetch profile only once on mount if user exists
  useEffect(() => {
    if (user && user.id) {
      const fetchProfile = async () => {
        try {
          const profileData = await authService.getProfile(user.id);
          setProfile(profileData);
        } catch {
          setProfile({ name_full: '' });
        }
      };
      fetchProfile();
    }
    // eslint-disable-next-line
  }, []); // <-- empty dependency array, runs only once

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file terlalu besar. Maksimal 2MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        alert('Format file tidak didukung. Hanya JPG, PNG, dan JPEG yang diperbolehkan.');
        return;
      }
      setSelectedFile(file);
      const fileReader = new FileReader();
      fileReader.onload = () => setPreviewUrl(fileReader.result);
      fileReader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
      .then(() => alert(`${type} berhasil disalin!`))
      .catch(err => console.error('Failed to copy: ', err));
  };

  const handleBankChange = (e) => {
    setSelectedBank(e.target.value);
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

    // Prepare payment confirmation data
    const paymentData = new FormData();
    paymentData.append('amount', course.price);
    paymentData.append('user_name', profile.name_full || user.username || '');
    paymentData.append('course_id', course.id);
    paymentData.append('course_title', course.title);
    paymentData.append('payment_method', selectedBank);
    paymentData.append('source_bank', formData.sourceBank);
    paymentData.append('source_account', formData.sourceAccount);
    paymentData.append('transfer_date', formData.transferDate);
    paymentData.append('proof_file', selectedFile);

    let authToken = user.access;

    const headers = {
      'Content-Type': 'multipart/form-data',
      'X-CSRFToken': csrfToken,
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // WhatsApp message
    const message = encodeURIComponent(
      `*Konfirmasi Pembayaran Ecourse*%0A------------------------------------%0A` +
      `Bismillah..%0A` +
      `Pada hari ini,%0A` +
      `Tanggal ${formatDate(formData.transferDate)}%0A` +
      `Saya ${formData.accountName || profile.name_full || user.username || ''} telah melakukan pembayaran untuk kelas ${course.title}%0A` +
      `dengan nominal Rp ${formatIDR(course.price)} melalui Bank ${bankAccounts[selectedBank].fullName}%0A%0A` +
      `Saya mengirim pembayaran dari Bank ${formData.sourceBank}, dengan No. Rekening ${formData.sourceAccount}%0A` +
      `------------------------------------%0A%0A` +
      `Bukti transfer telah saya upload, mohon konfirmasi.%0A` +
      `Semoga bermanfaat dan menjadi amal ibadah.`
    );

    try {
      // Replace with your actual backend endpoint for ecourse payment confirmation
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/courses/${course.slug}/payment-confirmation/`,
        paymentData,
        { headers }
      );

      if (response.status === 201 || response.status === 200) {
        // Open WhatsApp with prepared message
        window.open(`https://wa.me/6285643848251?text=${message}`, '_blank');
        // Navigate to course page
        navigate(`/kelas/${course.slug}`);
      } else {
        alert('Gagal mengkonfirmasi pembayaran. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error confirming payment:', error.response?.data || error.message);
      alert('Terjadi kesalahan saat mengkonfirmasi pembayaran. Silakan coba lagi.');
    }
  };

  if (!course) return <div>Loading...</div>;

  const selectedBankInfo = bankAccounts[selectedBank];

  return (
    <div className="body">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Thank you message */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-gray-700">
            Terimakasih, <span className="text-green-600">{profile.name_full || user.username}</span>
          </h1>
          <p className="text-gray-600">
            atas pembayaran Anda untuk kelas:
          </p>
          <h2 className="text-2xl font-bold mt-2 mb-6">{course.title}</h2>
        </div>

        {/* Bank selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pilih Bank Tujuan
          </label>
          <select
            value={selectedBank}
            onChange={handleBankChange}
            className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
          >
            <option value="bsi">Bank Syariah Indonesia (BSI)</option>
            <option value="bjb">Bank Jabar Banten Syariah (BJB)</option>
          </select>
        </div>

        {/* Bank information card */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-4 flex items-center">
            <img
              src={selectedBankInfo.logo}
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
                  Salin No Rek.
                </button>
              </div>
              <p className="text-gray-600">a.n. {selectedBankInfo.owner}</p>
            </div>
          </div>
        </div>

        {/* Amount card */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex items-center mb-2">
              <div className="flex-1 flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  <span className="text-green-500">{formatIDR(course.price)}</span>
                </h3>
                <button
                  onClick={() => copyToClipboard(course.price, 'Nominal')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center text-sm"
                >
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

export default EcoursePaymentConfirmation;