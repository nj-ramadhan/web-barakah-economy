import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import NavigationButton from '../components/layout/Navigation';
import authService from '../services/auth';
import axios from 'axios';
import '../styles/Body.css';

const API = process.env.REACT_APP_API_BASE_URL;

const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCompleteMode = new URLSearchParams(location.search).get('complete') === '1';
  const [missingFields, setMissingFields] = useState([]);

  const [profile, setProfile] = useState({
    name_full: '', nik: '', gender: '', birth_date: '', birth_place: '',
    marital_status: '', segment: '', study_level: '', study_campus: '',
    study_faculty: '', study_department: '', study_program: '',
    study_semester: '', study_start_year: '', study_finish_year: '',
    address: '', job: '', work_field: '', work_institution: '',
    work_position: '', work_salary: '', address_latitude: '',
    address_province: '', picture: null,
  });

  const [activeTab, setActiveTab] = useState('general');
  const [ktpScanning, setKtpScanning] = useState(false);
  const [ktpPreview, setKtpPreview] = useState(null);
  const [ktpResult, setKtpResult] = useState(null);
  const [showKtpBanner, setShowKtpBanner] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
          const profileData = await authService.getProfile(user.id);
          setProfile(profileData);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, [navigate]);

  // Check which fields are missing
  useEffect(() => {
    if (isCompleteMode) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.access) {
        axios.get(`${API}/api/profiles/check-completeness/`, {
          headers: { Authorization: `Bearer ${user.access}` }
        }).then(res => {
          setMissingFields(res.data.missing_fields || []);
        }).catch(() => {});
      }
    }
  }, [isCompleteMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: name === 'work_salary' ? formatIDR(value.replace(/[^0-9]/g, '')) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran foto terlalu besar. Maksimal 5MB.');
        return;
      }
      setProfile((prev) => ({ ...prev, picture: file }));
    }
  };

  const handleKtpScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file KTP terlalu besar. Maksimal 10MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setKtpPreview(ev.target.result);
    reader.readAsDataURL(file);

    // Send to OCR
    setKtpScanning(true);
    setKtpResult(null);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const formData = new FormData();
      formData.append('ktp_image', file);
      const res = await axios.post(`${API}/api/profiles/scan-ktp/`, formData, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      const data = res.data;
      if (data._error) {
        setKtpResult({ success: false, message: data._error });
      } else {
        // Auto-fill profile fields
        const fillable = ['nik', 'name_full', 'gender', 'birth_place', 'birth_date', 'marital_status', 'address', 'address_province'];
        let filled = 0;
        setProfile(prev => {
          const updated = { ...prev };
          fillable.forEach(field => {
            if (data[field] && (!prev[field] || prev[field] === '')) {
              updated[field] = data[field];
              filled++;
            }
          });
          return updated;
        });
        setKtpResult({ success: true, message: `Berhasil mengisi ${filled} kolom dari KTP. Silakan periksa dan lengkapi data yang kurang.` });
      }
    } catch (err) {
      console.error('KTP scan error:', err);
      setKtpResult({ success: false, message: 'Gagal scan KTP. Silakan isi data secara manual.' });
    }
    setKtpScanning(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (profile.picture instanceof File && profile.picture.size > 5 * 1024 * 1024) {
      alert('File foto profil terlalu besar (Maks 5MB)');
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id) {
        const formData = new FormData();
        for (const key in profile) {
          if (profile[key] !== null && profile[key] !== undefined) {
            if (key === 'picture' && profile[key] instanceof File) {
              formData.append(key, profile[key]);
            } else if (key === 'work_salary') {
              formData.append(key, String(profile[key]).replace(/[^0-9]/g, ''));
            } else {
              formData.append(key, profile[key]);
            }
          }
        }
        if (!(profile.picture instanceof File)) {
          formData.delete('picture');
        }
        await authService.updateProfile(user.id, formData);
        alert('Data Profile berhasil diperbaharui');
        if (isCompleteMode) {
          navigate('/');
        } else {
          navigate('/profile');
        }
      }
    } catch (error) {
      alert('Data Profile gagal diperbaharui');
      console.error('Failed to update profile:', error);
    }
  };

  const FIELD_LABELS = {
    name_full: 'Nama Lengkap', gender: 'Jenis Kelamin', birth_place: 'Tempat Lahir',
    birth_date: 'Tanggal Lahir', address: 'Alamat', address_province: 'Provinsi',
    marital_status: 'Status Pernikahan', segment: 'Segmen',
  };

  const isFieldMissing = (field) => missingFields.includes(field);

  const inputCls = (field) =>
    `w-full p-3 border rounded-xl text-sm transition outline-none focus:ring-2 ${
      isFieldMissing(field) ? 'border-red-300 bg-red-50 focus:ring-red-400' : 'border-gray-200 bg-gray-50 focus:ring-green-500'
    }`;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nama Lengkap {isFieldMissing('name_full') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="text" name="name_full" placeholder="Nama Lengkap sesuai KTP" value={profile.name_full || ''} onChange={handleChange} className={inputCls('name_full')} />
            </div>
              {/* Start File Upload KTP inside tab */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-icons">badge</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900">Scan KTP Otomatis</h4>
                  <p className="text-xs text-blue-700 mt-0.5">Isi data lebih cepat dengan mengunggah foto KTP Anda.</p>
                  
                  {ktpResult && (
                    <div className={`mt-2 p-2 rounded-lg text-xs font-medium ${ktpResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {ktpResult.message}
                    </div>
                  )}
                </div>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition shadow-sm whitespace-nowrap self-stretch sm:self-auto text-center flex items-center justify-center gap-2">
                  <span className="material-icons text-sm">photo_camera</span>
                  {ktpScanning ? 'Memproses...' : 'Scan KTP'}
                  <input type="file" accept="image/*" capture="environment" onChange={handleKtpScan} className="hidden" disabled={ktpScanning} />
                </label>
              </div>
              {/* End File Upload KTP */}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  NIK (No. KTP) <span className="text-gray-400 text-[9px] font-normal">opsional</span>
                </label>
                <input type="text" name="nik" placeholder="16 digit NIK" maxLength="16" value={profile.nik || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 tracking-widest" />
              </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Jenis Kelamin {isFieldMissing('gender') && <span className="text-red-500">*wajib</span>}
              </label>
              <select name="gender" value={profile.gender || ''} onChange={handleChange} className={inputCls('gender')}>
                <option value="">Pilih Jenis Kelamin</option>
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tempat Lahir {isFieldMissing('birth_place') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="text" name="birth_place" placeholder="Tempat Lahir" value={profile.birth_place || ''} onChange={handleChange} className={inputCls('birth_place')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tanggal Lahir {isFieldMissing('birth_date') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="date" name="birth_date" value={profile.birth_date || ''} onChange={handleChange} className={inputCls('birth_date')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status Pernikahan</label>
              <select name="marital_status" value={profile.marital_status || ''} onChange={handleChange} className={inputCls('marital_status')}>
                <option value="">Pilih</option>
                <option value="bn">Belum Nikah</option><option value="n">Nikah</option>
                <option value="d">Duda</option><option value="j">Janda</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Segment</label>
              <select name="segment" value={profile.segment || ''} onChange={handleChange} className={inputCls('segment')}>
                <option value="">Pilih</option>
                <option value="mahasiswa">Mahasiswa</option><option value="pelajar">Pelajar</option>
                <option value="santri">Santri</option><option value="karyawan">Karyawan</option>
                <option value="umum">Umum</option>
              </select>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Alamat {isFieldMissing('address') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="text" name="address" placeholder="Alamat lengkap" value={profile.address || ''} onChange={handleChange} className={inputCls('address')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Provinsi {isFieldMissing('address_province') && <span className="text-red-500">*wajib</span>}
              </label>
              <select name="address_province" value={profile.address_province || ''} onChange={handleChange} className={inputCls('address_province')}>
                <option value="">Pilih Provinsi</option>
                {[['aceh','Aceh'],['sumatera_utara','Sumatera Utara'],['sumatera_barat','Sumatera Barat'],['riau','Riau'],['jambi','Jambi'],['sumatera_selatan','Sumatera Selatan'],['bengkulu','Bengkulu'],['lampung','Lampung'],['kepulauan_bangka_belitung','Kep. Bangka Belitung'],['kepulauan_riau','Kepulauan Riau'],['dki_jakarta','DKI Jakarta'],['jawa_barat','Jawa Barat'],['jawa_tengah','Jawa Tengah'],['di_yogyakarta','DI Yogyakarta'],['jawa_timur','Jawa Timur'],['banten','Banten'],['bali','Bali'],['nusa_tenggara_barat','NTB'],['nusa_tenggara_timur','NTT'],['kalimantan_barat','Kalimantan Barat'],['kalimantan_tengah','Kalimantan Tengah'],['kalimantan_selatan','Kalimantan Selatan'],['kalimantan_timur','Kalimantan Timur'],['kalimantan_utara','Kalimantan Utara'],['sulawesi_utara','Sulawesi Utara'],['sulawesi_tengah','Sulawesi Tengah'],['sulawesi_selatan','Sulawesi Selatan'],['sulawesi_tenggara','Sulawesi Tenggara'],['gorontalo','Gorontalo'],['sulawesi_barat','Sulawesi Barat'],['maluku','Maluku'],['maluku_utara','Maluku Utara'],['papua','Papua'],['papua_barat','Papua Barat']].map(([v,l])=>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Latitude</label>
              <input type="number" name="address_latitude" placeholder="Latitude" value={profile.address_latitude || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Longitude</label>
              <input type="number" name="address_longitude" placeholder="Longitude" value={profile.address_longitude || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        );

      case 'study':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tingkat Pendidikan</label>
              <select name="study_level" value={profile.study_level || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Pilih</option>
                <option value="sd">SD/Setara</option><option value="smp">SMP/Setara</option>
                <option value="sma">SMA/SMK/Setara</option><option value="s1">Sarjana</option>
                <option value="s2">Magister</option><option value="s3">Doktor</option>
              </select>
            </div>
            {['study_campus','study_faculty','study_department','study_program'].map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{f === 'study_campus' ? 'Kampus' : f === 'study_faculty' ? 'Fakultas' : f === 'study_department' ? 'Jurusan' : 'Program Studi'}</label>
                <input type="text" name={f} placeholder={f.replace('study_','')} value={profile[f] || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              {['study_semester','study_start_year','study_finish_year'].map(f => (
                <div key={f}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{f === 'study_semester' ? 'Semester' : f === 'study_start_year' ? 'Thn Masuk' : 'Thn Lulus'}</label>
                  <input type="number" name={f} value={profile[f] || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pekerjaan</label>
              <select name="job" value={profile.job || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Pilih</option>
                {[['mahasiswa','Mahasiswa'],['asn','ASN'],['karyawan_swasta','Karyawan Swasta'],['guru','Guru'],['dosen','Dosen'],['dokter','Dokter'],['perawat','Perawat'],['apoteker','Apoteker'],['programmer','Programmer'],['data_scientist','Data Scientist'],['desainer_grafis','Desainer Grafis'],['marketing','Marketing'],['hrd','HRD'],['akuntan','Akuntan'],['konsultan','Konsultan'],['arsitek','Arsitek'],['insinyur','Insinyur'],['peneliti','Peneliti'],['jurnalis','Jurnalis'],['penulis','Penulis'],['penerjemah','Penerjemah'],['pilot','Pilot'],['pramugari','Pramugari'],['chef','Chef'],['pengusaha','Pengusaha'],['petani','Petani'],['nelayan','Nelayan'],['pengrajin','Pengrajin'],['teknisi','Teknisi'],['seniman','Seniman'],['musisi','Musisi'],['atlet','Atlet'],['polisi','Polisi'],['tentara','Tentara'],['pengacara','Pengacara'],['notaris','Notaris'],['psikolog','Psikolog'],['sopir','Sopir'],['kurir','Kurir'],['barista','Barista'],['freelancer','Freelancer']].map(([v,l])=>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bidang Pekerjaan</label>
              <select name="work_field" value={profile.work_field || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Pilih</option>
                {[['pendidikan','Pendidikan'],['kesehatan','Kesehatan'],['ekobis','Ekonomi Bisnis'],['agrotek','Agrotek'],['herbal','Herbal-Farmasi'],['it','IT'],['manufaktur','Manufaktur'],['energi','Energi-Mineral'],['sains','Sains'],['teknologi','Teknologi'],['polhuk','Politik-Hukum'],['humaniora','Humaniora'],['media','Media-Literasi'],['sejarah','Sejarah']].map(([v,l])=>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            {['work_institution','work_position'].map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{f === 'work_institution' ? 'Instansi' : 'Posisi/Jabatan'}</label>
                <input type="text" name={f} placeholder={f.replace('work_','')} value={profile[f] || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gaji (Rp)</label>
              <input type="text" name="work_salary" placeholder="0" value={profile.work_salary || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Header />
      <div className="container max-w-2xl mx-auto px-4 py-4 pb-24">

        {/* ===== COMPLETION BANNER ===== */}
        {isCompleteMode && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 mb-4 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-start gap-3">
              <span className="material-icons text-3xl mt-0.5">warning</span>
              <div>
                <h3 className="font-bold text-lg">Lengkapi Data Diri Anda</h3>
                <p className="text-sm opacity-90 mt-1">
                  Untuk menggunakan fitur Barakah Economy, Anda wajib melengkapi data biodata terlebih dahulu.
                  {missingFields.length > 0 && (
                    <span className="block mt-1 font-bold text-yellow-200">
                      Field wajib: {missingFields.map(f => FIELD_LABELS[f] || f).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top UI banners (removed KTP scan from here, moved to Umum tab) */}

        {/* ===== EDIT FORM ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <BackButton fallback="/profile" />
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
            </div>

            {/* Profile Picture */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img
                  src={profile.picture instanceof File ? URL.createObjectURL(profile.picture) : (profile.picture || `${API}/media/profile_images/pas_foto_standard.png`)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <label className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-green-100 transition inline-flex items-center gap-2">
                  <span className="material-icons text-sm">upload</span> Ganti Foto
                  <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">Maks 5MB. JPG/PNG</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
                {[
                  { key: 'general', icon: 'person', label: 'Umum' },
                  { key: 'address', icon: 'location_on', label: 'Alamat' },
                  { key: 'study', icon: 'school', label: 'Pendidikan' },
                  { key: 'work', icon: 'work', label: 'Pekerjaan' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-bold transition ${
                      activeTab === tab.key
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="material-icons text-sm">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[300px]">
                {renderTabContent()}
              </div>

              {/* Submit Button */}
              <button type="submit" className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center mt-6 shadow-lg shadow-green-100 transition">
                <span className="material-icons mr-2">save</span>
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default ProfileEditPage;