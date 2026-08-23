import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import { getMediaUrl } from '../utils/mediaUtils';
import { toDateInputString } from '../utils/dateUtils';
import { safeStorage } from '../utils/storageUtils';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';
import authService from '../services/auth';
import axios from 'axios';
import '../styles/Body.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapClickHandler = ({ setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const API = process.env.REACT_APP_API_BASE_URL;

const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isFirstTime = sessionStorage.getItem('just_registered') === 'true' || queryParams.get('first_time') === '1';
  const requiredFor = queryParams.get('required_for');
  const isCompleteMode = queryParams.get('complete') === '1' || !!requiredFor;
  const [missingFields, setMissingFields] = useState([]);
  const [profile, setProfile] = useState({
    name_full: '', nickname: '', nik: '', gender: '', agama: '', birth_date: '', birth_place: '',
    marital_status: '', segment: '', study_level: '', study_campus: '',
    study_faculty: '', study_department: '', study_program: '',
    study_semester: '', study_start_year: '', study_finish_year: '',
    address: '', job: '', work_field: '', work_institution: '',
    address_longitude: '', address_province: '', address_province_id: '',
    address_city_id: '', address_city_name: '',
    shop_thumbnail: null,
    address_subdistrict_id: '',
    address_subdistrict_name: '',
    address_village_id: '',
    address_village_name: '',
    username: '',
    phone: '',
    shop_supported_couriers: 'jne,pos,tiki,jnt',
    info_source: '',
    referred_by: '',
    is_google_user: false,
    username_change_count: 0,
  });




  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);




  const [cropper, setCropper] = useState({ active: false, image: null });
  const [activeTab, setActiveTab] = useState('general');

  const [loading, setLoading] = useState(true);
  const [agamaDropdown, setAgamaDropdown] = useState('');
  const [customAgama, setCustomAgama] = useState('');

  // Unified fetch for Profile & Completeness check
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const user = safeStorage.getUser();
        if (user && user.id) {
          const profileData = await authService.getProfile(user.id);
          if (profileData && profileData.birth_date) {
            profileData.birth_date = toDateInputString(profileData.birth_date);
          }
          setProfile(profileData);
          
          const agamaVal = profileData.agama || '';
          if (['', 'islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu'].includes(agamaVal)) {
            setAgamaDropdown(agamaVal);
          } else {
            setAgamaDropdown('kepercayaan');
            setCustomAgama(agamaVal);
          }

          if (isCompleteMode && user.access) {
            try {
              const res = await axios.get(`${API}/api/profiles/check-completeness/`, {
                headers: { Authorization: `Bearer ${user.access}` }
              });
              setMissingFields(res.data.missing_fields || []);
            } catch (err) { }
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate, isCompleteMode]);


  // Expedition API Fetchers


  // Lazy Expedition API Fetchers
  const fetchProvinces = async (force = false) => {
    if (provinces.length > 0 && !force) return;
    try {
      const res = await axios.get(`${API}/api/shippings/provinces/`);
      if (Array.isArray(res.data)) setProvinces(res.data);
    } catch (err) {
      console.error("Failed to fetch provinces", err);
    }
  };

  const fetchCities = async (provinceId, force = false) => {
    if (!provinceId) return;
    if (cities.length > 0 && !force) return;
    setLoadingCities(true);
    try {
      const res = await axios.get(`${API}/api/shippings/cities/?province=${provinceId}`);
      if (Array.isArray(res.data)) setCities(res.data);
    } catch (err) {
      console.error("Failed to fetch cities", err);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchDistricts = async (cityId, force = false) => {
    if (!cityId) return;
    if (districts.length > 0 && !force) return;
    setLoadingDistricts(true);
    try {
      const res = await axios.get(`${API}/api/shippings/districts/?city=${cityId}`);
      if (Array.isArray(res.data)) setDistricts(res.data);
    } catch (err) {
      console.error("Failed to fetch districts", err);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchVillages = async (districtId, force = false) => {
    if (!districtId) return;
    if (villages.length > 0 && !force) return;
    setLoadingVillages(true);
    try {
      const res = await axios.get(`${API}/api/shippings/villages/?district=${districtId}`);
      if (Array.isArray(res.data)) setVillages(res.data);
    } catch (err) {
      console.error("Failed to fetch villages", err);
    } finally {
      setLoadingVillages(false);
    }
  };



  // Auto-detect location from coordinates (Reverse Geocoding)
  useEffect(() => {
    const detectLocation = async () => {
      // PROMPT FIX: If we already have a province and city, don't auto-overwrite with detectLocation on mount
      if (profile.address_province_id && profile.address_city_id) return;
      if (!profile.address_latitude || !profile.address_longitude) return;

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${profile.address_latitude}&lon=${profile.address_longitude}&zoom=10&addressdetails=1`);
        const data = await response.json();

        if (data.address) {
          const state = data.address.state || '';
          const cityName = data.address.city || data.address.town || data.address.municipality || data.address.county || '';

          if (state && provinces.length > 0) {
            // Match Province
            const matchProvince = provinces.find(p =>
              state.toLowerCase().includes(p.province.toLowerCase()) ||
              p.province.toLowerCase().includes(state.toLowerCase())
            );

            if (matchProvince) {
              setProfile(prev => ({
                ...prev,
                address_province_id: matchProvince.province_id,
                address_province: matchProvince.province
              }));

              // Fetch cities lazily for this province so city matching can happen
              fetchCities(matchProvince.province_id, true);

              // We will use another effect or wait for cities to load to match the city
              // Storing detected city name temporarily to match once cities are fetched
              setProfile(prev => ({ ...prev, _detected_city: cityName }));
            }
          }
        }
      } catch (err) {
        console.error("Reverse geocoding failed", err);
      }
    };
    detectLocation();
  }, [profile.address_latitude, profile.address_longitude, provinces.length > 0]);

  // Match city once cities are loaded after auto-province detection
  useEffect(() => {
    if (profile._detected_city && cities.length > 0 && profile.address_province_id) {
      const cityToFind = profile._detected_city.toLowerCase();
      const matchCity = cities.find(c =>
        cityToFind.includes(c.city_name.toLowerCase()) ||
        c.city_name.toLowerCase().includes(cityToFind)
      );

      if (matchCity) {
        setProfile(prev => ({
          ...prev,
          address_city_id: matchCity.city_id,
          address_city_name: `${matchCity.type} ${matchCity.city_name}`,
          _detected_city: null // Clear once matched
        }));
      }
    }
  }, [cities, profile._detected_city]);



  const ProfileSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-5"></div>

        {/* Profile Picture Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-200"></div>
          <div>
            <div className="h-8 bg-gray-200 rounded-lg w-28 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-32"></div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex bg-gray-50 rounded-xl p-1 mb-5 gap-1">
          <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
          <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
          <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
          <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
        </div>

        {/* Form Fields Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-12 bg-gray-100 rounded-xl w-full"></div>
            </div>
          ))}
        </div>

        <div className="h-12 bg-gray-200 rounded-xl w-full mt-6"></div>
      </div>
    </div>
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'work_salary' ? formatIDR(value.replace(/[^0-9]/g, '')) : value,
      };
      if (name === 'info_source' && value !== 'teman') {
        updated.referred_by = '';
      }
      return updated;
    });

    if (value && value.trim() !== '') {
      setMissingFields((prev) => prev.filter(f => f !== name));
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran foto terlalu besar. Maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropper({ active: true, image: ev.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    try {
      if (!croppedBlob) {
        setCropper({ active: false, image: null });
        return;
      }
      const file = new File([croppedBlob], 'profile_picture.jpg', { type: 'image/jpeg' });
      setProfile((prev) => ({ ...prev, picture: file }));
      setCropper({ active: false, image: null });
    } catch (err) {
      console.error('Error creating cropped file:', err);
      alert('Gagal memproses gambar. Silakan coba lagi.');
      setCropper({ active: false, image: null });
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mandatory fields check
    const isReferredByRequired = profile.info_source === 'teman';
    const mandatoryList = [
      { key: 'nickname', label: 'Nama Panggilan', tab: 'general' },
      { key: 'name_full', label: 'Nama Lengkap', tab: 'general' },
      { key: 'phone', label: 'HP / WhatsApp', tab: 'general' },
      { key: 'gender', label: 'Jenis Kelamin', tab: 'general' },
      { key: 'agama', label: 'Agama', tab: 'general', inputName: 'agamaDropdown' },
      { key: 'birth_place', label: 'Tempat Lahir', tab: 'general' },
      { key: 'birth_date', label: 'Tanggal Lahir', tab: 'general' },
      { key: 'marital_status', label: 'Status Pernikahan', tab: 'general' },
      { key: 'segment', label: 'Segmen', tab: 'general' },
      { key: 'info_source', label: 'Sumber Informasi', tab: 'general' },
    ];

    if (isReferredByRequired) {
      mandatoryList.push({ key: 'referred_by', label: 'Nama Pengajak', tab: 'general' });
    }

    const firstMissing = mandatoryList.find(m => !profile[m.key] || String(profile[m.key]).trim() === '');
    if (firstMissing) {
      setActiveTab(firstMissing.tab);
      setTimeout(() => {
        const targetName = firstMissing.inputName || firstMissing.key;
        const elem = document.getElementsByName(targetName)[0];
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elem.focus();
        }
      }, 150);
      alert(`Mohon lengkapi "${firstMissing.label}" terlebih dahulu.`);
      return;
    }

    if (profile.picture instanceof File && profile.picture.size > 5 * 1024 * 1024) {
      alert('File foto profil terlalu besar (Maks 5MB)');
      return;
    }

    // Validation for Shipping (Village ID must be 10 digits if address is started)
    if (profile.address_province_id && !profile.address_village_id) {
      setActiveTab('address');
      setTimeout(() => {
        const elem = document.getElementsByName('address_village_id')[0] || document.getElementsByName('address')[0];
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elem.focus();
        }
      }, 150);
      alert('Mohon lengkapi Kelurahan/Desa Anda untuk akurasi data pengiriman.');
      return;
    }

    try {
      const user = safeStorage.getUser();
      if (user && user.id) {
        const formData = new FormData();
        const numericFields = ['study_semester', 'study_start_year', 'study_finish_year', 'address_latitude', 'address_longitude', 'work_salary'];

        for (const key in profile) {
          if (profile[key] !== null && profile[key] !== undefined) {
            // Fix 1: Handle Files correctly
            const imageFields = ['picture', 'ktp_image', 'shop_thumbnail'];
            if (imageFields.includes(key)) {
              if (profile[key] instanceof File) {
                formData.append(key, profile[key]);
              }
            }
            // Fix 2: Clean salary and other numeric fields
            else if (key === 'work_salary' && typeof profile[key] === 'string') {
              let val = profile[key];
              if (val.includes('.') && val.endsWith('.00')) {
                val = val.split('.')[0];
              }
              const cleanValue = val.replace(/[^0-9]/g, '');
              if (cleanValue) formData.append(key, cleanValue);
            }
            // Fix 3: Skip empty strings for numeric fields, but allow '0'
            else if (numericFields.includes(key) && profile[key] === '') {
              // Skip
            }
            // Fix 4: Handle all other fields, ensuring even strings of numbers are sent
            else if (profile[key] !== '') {
              formData.append(key, profile[key]);
            }
          }
        }

        const updatedProfile = await authService.updateProfile(user.id, formData);

        // Update user in safeStorage with new picture and completion status
        if (updatedProfile) {
          const currentUser = safeStorage.getUser();
          if (currentUser) {
            if (updatedProfile.picture) currentUser.picture = updatedProfile.picture;
            currentUser.is_profile_complete = updatedProfile.is_profile_complete;
            if (updatedProfile.username) currentUser.username = updatedProfile.username;
            safeStorage.setUser(currentUser);
          }
        }

        sessionStorage.removeItem('just_registered');
        alert('Data Profile berhasil diperbaharui');
        if (requiredFor === 'checkout') {
          navigate('/checkout');
        } else if (isCompleteMode) {
          navigate('/');
        } else {
          navigate('/profile');
        }
      }
    } catch (error) {

      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Data Profile gagal diperbaharui';
      alert('Error: ' + errorMsg);
      console.error('Failed to update profile:', error);
    }
  };

  const handleSkipLater = () => {
    sessionStorage.removeItem('just_registered');
    const fromPath = location.state?.from?.pathname || (requiredFor === 'checkout' ? '/cart' : '/');
    navigate(fromPath);
  };

  const handleCancel = () => {
    const fromPath = location.state?.from?.pathname || (requiredFor === 'checkout' ? '/cart' : '/profile');
    navigate(fromPath);
  };

  const getTabMissingFields = (tabKey) => {
    const missing = [];
    if (tabKey === 'general') {
      const generalMandatory = [
        'nickname', 'name_full', 'phone', 'gender', 'agama',
        'birth_place', 'birth_date', 'marital_status', 'segment', 'info_source'
      ];
      if (profile.info_source === 'teman') {
        generalMandatory.push('referred_by');
      }
      generalMandatory.forEach(f => {
        if (!profile[f] || String(profile[f]).trim() === '') {
          missing.push(f);
        }
      });
      if (missingFields.includes('nik') && (!profile.nik || !String(profile.nik).trim())) {
        if (!missing.includes('nik')) missing.push('nik');
      }
    } else if (tabKey === 'address') {
      const addressMandatory = ['address', 'address_province_id', 'address_city_id', 'address_subdistrict_id', 'address_village_id'];
      const isAddressRequired = isCompleteMode || requiredFor === 'checkout' || missingFields.some(f => f.startsWith('address')) || profile.address || profile.address_province_id;
      if (isAddressRequired) {
        addressMandatory.forEach(f => {
          if (!profile[f] || String(profile[f]).trim() === '') {
            missing.push(f);
          }
        });
      }
    } else if (tabKey === 'study') {
      const isStudySegment = ['mahasiswa', 'pelajar', 'santri'].includes(profile.segment);
      const isStudyRequired = isCompleteMode && (isStudySegment || missingFields.some(f => f.startsWith('study')));
      if (isStudyRequired) {
        const studyMandatory = ['study_level', 'study_campus'];
        if (profile.study_level && !['sd', 'smp', 'sma'].includes(profile.study_level)) {
          studyMandatory.push('study_faculty', 'study_department', 'study_program', 'study_semester', 'study_start_year', 'study_finish_year');
        }
        studyMandatory.forEach(f => {
          if (missingFields.includes(f) || isStudySegment) {
            if (!profile[f] || String(profile[f]).trim() === '') {
              if (!missing.includes(f)) missing.push(f);
            }
          }
        });
      }
    } else if (tabKey === 'work') {
      const isWorkSegment = ['karyawan', 'umum', 'pengusaha'].includes(profile.segment);
      const isWorkRequired = isCompleteMode && (isWorkSegment || missingFields.some(f => f.startsWith('work_') || f === 'job'));
      if (isWorkRequired) {
        const workMandatory = ['job', 'work_field', 'work_institution', 'work_position', 'work_salary'];
        workMandatory.forEach(f => {
          if (missingFields.includes(f) || isWorkSegment) {
            if (!profile[f] || String(profile[f]).trim() === '') {
              if (!missing.includes(f)) missing.push(f);
            }
          }
        });
      }
    }
    return missing;
  };

  const tabMissingCounts = {
    general: getTabMissingFields('general').length,
    address: getTabMissingFields('address').length,
    study: getTabMissingFields('study').length,
    work: getTabMissingFields('work').length,
  };

  const FIELD_LABELS = {
    name_full: 'Nama Lengkap', nickname: 'Nama Panggilan', gender: 'Jenis Kelamin', agama: 'Agama', birth_place: 'Tempat Lahir',
    birth_date: 'Tanggal Lahir', address: 'Alamat', address_province: 'Provinsi',
    address_city_name: 'Kota/Kabupaten', address_subdistrict_name: 'Kecamatan',
    address_village_name: 'Kelurahan/Desa',
    marital_status: 'Status Pernikahan', segment: 'Segmen',
    info_source: 'Sumber Informasi', referred_by: 'Nama Pengajak',
  };

  const isFieldMissing = (field) => {
    const allMissing = [
      ...getTabMissingFields('general'),
      ...getTabMissingFields('address'),
      ...getTabMissingFields('study'),
      ...getTabMissingFields('work'),
      ...missingFields
    ];
    return allMissing.includes(field) && (!profile[field] || String(profile[field]).trim() === '');
  };

  const inputCls = (field) => {
    const isError = isFieldMissing(field);
    return `w-full p-3 border rounded-xl text-sm transition outline-none focus:ring-2 ${isError
      ? 'border-red-500 bg-red-50 focus:ring-red-400'
      : 'border-gray-200 bg-gray-50 focus:ring-green-500'
      }`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                placeholder="Username Anda"
                value={profile.username || ''}
                onChange={handleChange}
                disabled={profile.username_change_count >= 1}
                className={`w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed`}
              />
              {profile.username_change_count === 0 ? (
                <p className="text-[10px] text-emerald-600 font-bold mt-1">
                  Anda dapat mengubah username sebanyak 1x saja.
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 font-bold mt-1">
                  Anda sudah menggunakan kesempatan 1x mengubah username.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nama Panggilan <span className="text-red-500">*wajib</span>
              </label>
              <input type="text" name="nickname" placeholder="Nama Panggilan / Nickname" value={profile.nickname || ''} onChange={handleChange} className={inputCls('nickname')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nama Lengkap <span className="text-red-500">*wajib</span>
              </label>
              <input type="text" name="name_full" placeholder="Nama Lengkap sesuai KTP" value={profile.name_full || ''} onChange={handleChange} className={inputCls('name_full')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                HP / WhatsApp <span className="text-red-500">*wajib</span>
              </label>
              <input type="text" name="phone" placeholder="Contoh: 081234567890" value={profile.phone || ''} onChange={handleChange} className={inputCls('phone')} />
            </div>


            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                NIK (No. KTP) <span className="text-gray-400 text-[9px] font-normal">opsional</span>
              </label>
              <input type="text" name="nik" placeholder="16 digit NIK" maxLength="16" value={profile.nik || ''} onChange={handleChange} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 tracking-widest" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Jenis Kelamin <span className="text-red-500">*wajib</span>
              </label>
              <select name="gender" value={profile.gender || ''} onChange={handleChange} className={inputCls('gender')}>
                <option value="">Pilih Jenis Kelamin</option>
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Agama <span className="text-red-500">*wajib</span>
              </label>
              <select 
                name="agamaDropdown" 
                value={agamaDropdown} 
                onChange={(e) => {
                  const val = e.target.value;
                  setAgamaDropdown(val);
                  if (val !== 'kepercayaan') {
                    setProfile(prev => ({ ...prev, agama: val }));
                    setCustomAgama('');
                    if (val !== '') {
                      setMissingFields(prev => prev.filter(f => f !== 'agama'));
                    }
                  } else {
                    setProfile(prev => ({ ...prev, agama: customAgama }));
                  }
                }} 
                className={inputCls('agama')}
              >
                <option value="">Pilih Agama</option>
                <option value="islam">Islam</option>
                <option value="kristen">Kristen</option>
                <option value="katolik">Katolik</option>
                <option value="hindu">Hindu</option>
                <option value="buddha">Buddha</option>
                <option value="konghucu">Konghucu</option>
                <option value="kepercayaan">Kepercayaan YME / Lainnya</option>
              </select>
            </div>

            {agamaDropdown === 'kepercayaan' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nama Aliran Kepercayaan / Lainnya <span className="text-red-500">*wajib</span>
                </label>
                <input 
                  type="text" 
                  name="customAgama" 
                  placeholder="Contoh: Sunda Wiwitan, Parmalim, Kaharingan, dll." 
                  value={customAgama} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomAgama(val);
                    setProfile(prev => ({ ...prev, agama: val }));
                    if (val && val.trim() !== '') {
                      setMissingFields(prev => prev.filter(f => f !== 'agama'));
                    }
                  }} 
                  className={inputCls('agama')} 
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tempat Lahir <span className="text-red-500">*wajib</span>
              </label>
              <input type="text" name="birth_place" placeholder="Tempat Lahir" value={profile.birth_place || ''} onChange={handleChange} className={inputCls('birth_place')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tanggal Lahir <span className="text-red-500">*wajib</span>
              </label>
              <input type="date" name="birth_date" value={profile.birth_date || ''} onChange={handleChange} className={inputCls('birth_date')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Status Pernikahan <span className="text-red-500">*wajib</span>
              </label>
              <select name="marital_status" value={profile.marital_status || ''} onChange={handleChange} className={inputCls('marital_status')}>
                <option value="">Pilih</option>
                <option value="bn">Belum Nikah</option><option value="n">Nikah</option>
                <option value="d">Duda</option><option value="j">Janda</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Segment <span className="text-red-500">*wajib</span>
              </label>
              <select name="segment" value={profile.segment || ''} onChange={handleChange} className={inputCls('segment')}>
                <option value="">Pilih</option>
                <option value="mahasiswa">Mahasiswa</option><option value="pelajar">Pelajar</option>
                <option value="santri">Santri</option><option value="karyawan">Karyawan</option>
                <option value="umum">Umum</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Sumber Informasi <span className="text-red-500">*wajib</span>
              </label>
              <select name="info_source" value={profile.info_source || ''} onChange={handleChange} className={inputCls('info_source')}>
                <option value="">Pilih Sumber Informasi</option>
                <option value="sosmed">Sosial Media (Instagram/FB/TikTok)</option>
                <option value="wa">WhatsApp Group / Chat</option>
                <option value="teman">Teman / Keluarga</option>
                <option value="iklan">Iklan</option>
                <option value="website">Website / Google</option>
                <option value="event">Event / Acara</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            {profile.info_source === 'teman' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Nama Pengajak / Rekomendasi <span className="text-red-500">*wajib</span>
                </label>
                <input 
                  type="text" 
                  name="referred_by" 
                  placeholder="Nama orang yang mengajak Anda" 
                  value={profile.referred_by || ''} 
                  onChange={handleChange} 
                  className={inputCls('referred_by')} 
                />
              </div>
            )}

          </div>
        );


      case 'address':
        return (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2">
              <div className="flex gap-3">
                <span className="material-icons text-emerald-600">location_on</span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Alamat & Pengiriman</h4>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">Alamat data diri ini digunakan sebagai alamat pengiriman saat berbelanja di E-Commerce.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Alamat Lengkap {isFieldMissing('address') && <span className="text-red-500">*wajib</span>}
                </label>
                <textarea
                  name="address"
                  rows="2"
                  placeholder="Nama jalan, Nomor rumah, RT/RW..."
                  value={profile.address || ''}
                  onChange={handleChange}
                  className={inputCls('address')}
                />
              </div>

              {/* 4-Tier Selection Hierarchy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Provinsi {isFieldMissing('address_province') && <span className="text-red-500">*wajib</span>}
                  </label>
                  <select
                    name="address_province_id"
                    value={profile.address_province_id || ''}
                    onFocus={() => fetchProvinces()}
                    onChange={(e) => {
                      const selected = provinces.find(p => p.province_id === e.target.value);
                      setProfile(prev => ({
                        ...prev,
                        address_province_id: e.target.value,
                        address_province: selected ? selected.province : '',
                        address_city_id: '', address_city_name: '',
                        address_subdistrict_id: '', address_subdistrict_name: '',
                        address_village_id: '', address_village_name: ''
                      }));
                      setCities([]);
                      setDistricts([]);
                      setVillages([]);
                    }}
                    className={inputCls('address_province')}
                  >
                    <option value="">Pilih Provinsi</option>
                    {provinces.length === 0 && profile.address_province_id && (
                      <option value={profile.address_province_id}>{profile.address_province || 'Loading...'}</option>
                    )}
                    {provinces.map(p => (
                      <option key={p.province_id} value={p.province_id}>{p.province}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Kota / Kabupaten {isFieldMissing('address_city_name') && <span className="text-red-500">*wajib</span>}
                  </label>
                  <select
                    name="address_city_id"
                    value={profile.address_city_id || ''}
                    onFocus={() => fetchCities(profile.address_province_id)}
                    onChange={(e) => {
                      const val = String(e.target.value);
                      const selected = cities.find(c => String(c.city_id) === val);
                      setProfile(prev => ({
                        ...prev,
                        address_city_id: val,
                        address_city_name: selected ? (`${selected.type} ${selected.city_name}`) : '',
                        address_subdistrict_id: '', address_subdistrict_name: '',
                        address_village_id: '', address_village_name: ''
                      }));
                      setDistricts([]);
                      setVillages([]);
                    }}
                    disabled={!profile.address_province_id || loadingCities}
                    className={inputCls('address_city_name')}
                  >
                    <option value="">{loadingCities ? 'Memuat Kota...' : 'Pilih Kota'}</option>
                    {cities.length === 0 && profile.address_city_id && (
                      <option value={profile.address_city_id}>{profile.address_city_name || 'Loading...'}</option>
                    )}
                    {cities.map(c => (
                      <option key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Kecamatan
                  </label>
                  <select
                    name="address_subdistrict_id"
                    value={profile.address_subdistrict_id || ''}
                    onFocus={() => fetchDistricts(profile.address_city_id)}
                    onChange={(e) => {
                      const val = String(e.target.value);
                      const selected = districts.find(d => String(d.district_id) === val);
                      setProfile(prev => ({
                        ...prev,
                        address_subdistrict_id: val,
                        address_subdistrict_name: selected ? selected.district_name : '',
                        address_village_id: '', address_village_name: ''
                      }));
                      setVillages([]);
                    }}
                    disabled={!profile.address_city_id || loadingDistricts}
                    className={inputCls('address_subdistrict_name')}
                  >
                    <option value="">{loadingDistricts ? 'Memuat Kecamatan...' : 'Pilih Kecamatan'}</option>
                    {districts.length === 0 && profile.address_subdistrict_id && (
                      <option value={profile.address_subdistrict_id}>{profile.address_subdistrict_name || 'Loading...'}</option>
                    )}
                    {districts.map(d => (
                      <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Kelurahan / Desa
                  </label>
                  <select
                    name="address_village_id"
                    value={profile.address_village_id || ''}
                    onFocus={() => fetchVillages(profile.address_subdistrict_id)}
                    onChange={(e) => {
                      const val = String(e.target.value);
                      const selected = villages.find(v => String(v.village_id) === val);
                      setProfile(prev => ({
                        ...prev,
                        address_village_id: val,
                        address_village_name: selected ? selected.village_name : ''
                      }));
                    }}
                    disabled={!profile.address_subdistrict_id || loadingVillages}
                    className={inputCls('address_village_name')}
                  >
                    <option value="">{loadingVillages ? 'Memuat Kelurahan...' : 'Pilih Kelurahan'}</option>
                    {villages.length === 0 && profile.address_village_id && (
                      <option value={profile.address_village_id}>{profile.address_village_name || 'Loading...'}</option>
                    )}
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>{v.village_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-icons text-sm text-gray-400">map</span>
                Titik Koordinat Peta (Opsional)
              </label>
              <div className="h-64 rounded-2xl overflow-hidden border border-gray-200 relative z-0 mb-4 shadow-inner">
                <MapContainer center={[profile.address_latitude || -6.914744, profile.address_longitude || 107.609810]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                  <MapClickHandler setLocation={(lat, lng) => setProfile(prev => ({ ...prev, address_latitude: lat, address_longitude: lng }))} />
                  {(profile.address_latitude && profile.address_longitude) && (
                    <Marker position={[profile.address_latitude, profile.address_longitude]} />
                  )}
                </MapContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
                  <input type="number" name="address_latitude" readOnly value={profile.address_latitude || ''} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono text-gray-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
                  <input type="number" name="address_longitude" readOnly value={profile.address_longitude || ''} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-mono text-gray-500" />
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-4 text-center">
              <button type="button" onClick={() => navigate(`/digital-produk/${profile.username}`)} className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition border border-emerald-200">
                <span className="material-icons">storefront</span>
                Lihat Toko Saya
              </button>
            </div>
          </div>
        );

      case 'study':
        const isBasicSchool = ['sd', 'smp', 'sma'].includes(profile.study_level);
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tingkat Pendidikan {isFieldMissing('study_level') && <span className="text-red-500">*wajib</span>}
              </label>
              <select name="study_level" value={profile.study_level || ''} onChange={handleChange} className={inputCls('study_level')}>
                <option value="">Pilih</option>
                <option value="sd">SD/Setara</option><option value="smp">SMP/Setara</option>
                <option value="sma">SMA/SMK/Setara</option><option value="s1">Sarjana</option>
                <option value="s2">Magister</option><option value="s3">Doktor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {isBasicSchool ? 'Nama Sekolah' : 'Kampus / Universitas'} {isFieldMissing('study_campus') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="text" name="study_campus" placeholder={isBasicSchool ? 'Contoh: SMA Negeri 1' : 'Contoh: Universitas Indonesia'} value={profile.study_campus || ''} onChange={handleChange} className={inputCls('study_campus')} />
            </div>

            {!isBasicSchool && ['study_faculty', 'study_department', 'study_program'].map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {f === 'study_faculty' ? 'Fakultas' : f === 'study_department' ? 'Jurusan' : 'Program Studi'} {isFieldMissing(f) && <span className="text-red-500">*wajib</span>}
                </label>
                <input type="text" name={f} placeholder={f.replace('study_', '')} value={profile[f] || ''} onChange={handleChange} className={inputCls(f)} />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 mt-2">
              {!isBasicSchool && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Semester {isFieldMissing('study_semester') && <span className="text-red-500">*wajib</span>}
                  </label>
                  <input type="number" name="study_semester" value={profile.study_semester || ''} onChange={handleChange} className={inputCls('study_semester')} />
                </div>
              )}
              {['study_start_year', 'study_finish_year'].map(f => (
                <div key={f}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {f === 'study_start_year' ? 'Thn Masuk' : 'Thn Lulus'} {isFieldMissing(f) && <span className="text-red-500">*wajib</span>}
                  </label>
                  <input type="number" name={f} value={profile[f] || ''} onChange={handleChange} className={inputCls(f)} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-xl shadow-sm text-xs font-medium border border-blue-100 flex items-start gap-2">
              <span className="material-icons text-blue-500 text-lg">info</span>
              Apabila segmen Anda Mahasiswa/Pelajar/Santri, formulir Pekerjaan ini hanya bersifat opsional.
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Pekerjaan {isFieldMissing('job') && <span className="text-red-500">*wajib</span>}
              </label>
              <select name="job" value={profile.job || ''} onChange={handleChange} className={inputCls('job')}>
                <option value="">Pilih</option>
                {[['mahasiswa', 'Mahasiswa'], ['asn', 'ASN'], ['karyawan_swasta', 'Karyawan Swasta'], ['guru', 'Guru'], ['dosen', 'Dosen'], ['dokter', 'Dokter'], ['perawat', 'Perawat'], ['apoteker', 'Apoteker'], ['programmer', 'Programmer'], ['data_scientist', 'Data Scientist'], ['desainer_grafis', 'Desainer Grafis'], ['marketing', 'Marketing'], ['hrd', 'HRD'], ['akuntan', 'Akuntan'], ['konsultan', 'Konsultan'], ['arsitek', 'Arsitek'], ['insinyur', 'Insinyur'], ['peneliti', 'Peneliti'], ['jurnalis', 'Jurnalis'], ['penulis', 'Penulis'], ['penerjemah', 'Penerjemah'], ['pilot', 'Pilot'], ['pramugari', 'Pramugari'], ['chef', 'Chef'], ['pengusaha', 'Pengusaha'], ['petani', 'Petani'], ['nelayan', 'Nelayan'], ['pengrajin', 'Pengrajin'], ['teknisi', 'Teknisi'], ['seniman', 'Seniman'], ['musisi', 'Musisi'], ['atlet', 'Atlet'], ['polisi', 'Polisi'], ['tentara', 'Tentara'], ['pengacara', 'Pengacara'], ['notaris', 'Notaris'], ['psikolog', 'Psikolog'], ['sopir', 'Sopir'], ['kurir', 'Kurir'], ['barista', 'Barista'], ['freelancer', 'Freelancer']].map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Bidang Pekerjaan {isFieldMissing('work_field') && <span className="text-red-500">*wajib</span>}
              </label>
              <select name="work_field" value={profile.work_field || ''} onChange={handleChange} className={inputCls('work_field')}>
                <option value="">Pilih</option>
                {[['pendidikan', 'Pendidikan'], ['kesehatan', 'Kesehatan'], ['ekobis', 'Ekonomi Bisnis'], ['agrotek', 'Agrotek'], ['herbal', 'Herbal-Farmasi'], ['it', 'IT'], ['manufaktur', 'Manufaktur'], ['energi', 'Energi-Mineral'], ['sains', 'Sains'], ['teknologi', 'Teknologi'], ['polhuk', 'Politik-Hukum'], ['humaniora', 'Humaniora'], ['media', 'Media-Literasi'], ['sejarah', 'Sejarah']].map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            {['work_institution', 'work_position'].map(f => (
              <div key={f}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {f === 'work_institution' ? 'Instansi' : 'Posisi/Jabatan'} {isFieldMissing(f) && <span className="text-red-500">*wajib</span>}
                </label>
                <input type="text" name={f} placeholder={f.replace('work_', '')} value={profile[f] || ''} onChange={handleChange} className={inputCls(f)} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Gaji (Rp) {isFieldMissing('work_salary') && <span className="text-red-500">*wajib</span>}
              </label>
              <input type="text" name="work_salary" placeholder="0" value={profile.work_salary || ''} onChange={handleChange} className={inputCls('work_salary')} />
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
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 mb-4 text-white shadow-lg relative overflow-hidden">
            <div className="flex items-start gap-3">
              <span className="material-icons text-3xl mt-0.5">
                {requiredFor === 'checkout' ? 'shopping_bag' : requiredFor === 'shop' ? 'storefront' : 'account_circle'}
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {requiredFor === 'checkout'
                    ? 'Lengkapi Alamat & Data Diri untuk Belanja'
                    : requiredFor === 'shop'
                    ? 'Lengkapi Profil untuk Membuka & Mengelola Toko'
                    : isFirstTime
                    ? 'Selamat Datang! Lengkapi Profil Anda'
                    : 'Lengkapi Data Diri Anda'}
                </h3>
                <p className="text-sm opacity-90 mt-1">
                  {requiredFor === 'checkout'
                    ? 'Alamat pengiriman dan nomor HP yang valid diperlukan agar pesanan Anda dapat diproses dengan benar.'
                    : requiredFor === 'shop'
                    ? 'Data profil dan alamat diperlukan untuk verifikasi toko Anda.'
                    : isFirstTime
                    ? 'Anda dapat melengkapi profil Anda sekarang untuk mendapatkan akses ke seluruh fitur, atau menyelesaikannya nanti.'
                    : 'Untuk menikmati seluruh fasilitas keanggotaan Barakah Economy, mohon lengkapi kolom bertanda merah di bawah ini.'}
                </p>
                {missingFields.filter(f => !profile[f] || String(profile[f]).trim() === '').length > 0 && (
                  <span className="block mt-2 text-xs font-semibold text-emerald-100 bg-emerald-800/40 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                    Kolom belum lengkap: {missingFields.filter(f => !profile[f] || String(profile[f]).trim() === '').map(f => FIELD_LABELS[f] || f).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top UI banners (removed KTP scan from here, moved to Umum tab) */}

        {/* ===== EDIT FORM ===== */}
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <BackButton fallback="/profile" />
                <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              </div>

              {/* Profile Picture */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                  <img
                    src={profile.picture instanceof File ? URL.createObjectURL(profile.picture) : getMediaUrl(profile.picture || '/media/profile_images/pas_foto_standard.png')}
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
                  ].map(tab => {
                    const count = tabMissingCounts[tab.key] || 0;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg text-xs font-bold transition relative ${
                          activeTab === tab.key
                            ? 'bg-white text-green-700 shadow-sm shadow-gray-200'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <span className="material-icons text-sm">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {count > 0 && (
                          <span className="ml-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-red-500 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                  {renderTabContent()}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  {isFirstTime ? (
                    <button
                      type="button"
                      onClick={handleSkipLater}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold flex items-center justify-center transition"
                    >
                      <span className="material-icons mr-1.5 text-base text-gray-500">schedule</span>
                      Nanti Lagi
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold flex items-center justify-center transition"
                    >
                      <span className="material-icons mr-1.5 text-base text-gray-500">close</span>
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-green-100 transition disabled:opacity-50"
                  >
                    <span className="material-icons mr-2">save</span>
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <NavigationButton />
      {cropper.active && (
        <ImageCropperModal
          image={cropper.image}
          aspect={1}
          maxWidth={512}
          maxHeight={512}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropper({ active: false, image: null })}
          title="Potong Foto Profil"
        />
      )}
    </div>
  );
};

export default ProfileEditPage;