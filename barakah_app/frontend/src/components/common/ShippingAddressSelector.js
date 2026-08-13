import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet Marker Icon bug in React builds
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map click listener component
const MapClickHandler = ({ onSelectLocation }) => {
  useMapEvents({
    click(e) {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Map view controller component to center map dynamically
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

const ShippingAddressSelector = ({ profile, onAddressSelect, selectedAddress }) => {
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const storageKey = user?.id ? `barakah_saved_addresses_${user.id}` : 'barakah_saved_addresses_guest';

  const API = process.env.REACT_APP_API_BASE_URL || '';

  // Form State
  const defaultFormData = {
    id: null,
    label: '',
    nama_penerima: '',
    phone: '',
    alamat: '',
    provinsi: '',
    address_province_id: '',
    kota: '',
    address_city_id: '',
    kecamatan: '',
    address_subdistrict_id: '',
    kelurahan: '',
    address_village_id: '',
    kode_pos: '',
    detail_alamat: '',
    titik_koordinat: '',
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Administrative Region Lists & Loading States
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Interactive Map & Search State
  const [mapCenter, setMapCenter] = useState([-6.914744, 107.609810]); // Default Bandung
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState([]);

  // Fetch Shipping Administrative Regions
  const fetchProvinces = async (force = false) => {
    if (provinces.length > 0 && !force) return;
    try {
      const res = await axios.get(`${API}/api/shippings/provinces/`);
      if (Array.isArray(res.data)) setProvinces(res.data);
    } catch (err) {
      console.error("Failed to fetch provinces:", err);
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
      console.error("Failed to fetch cities:", err);
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
      console.error("Failed to fetch districts:", err);
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
      console.error("Failed to fetch villages:", err);
    } finally {
      setLoadingVillages(false);
    }
  };

  // Helper to parse "lat, lng" string
  const parseCoords = (coordStr) => {
    if (!coordStr || typeof coordStr !== 'string') return null;
    const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return null;
  };

  // Update coordinates state and map center
  const updateCoordinates = (lat, lng) => {
    const formattedLat = Number(lat).toFixed(6);
    const formattedLng = Number(lng).toFixed(6);
    const coordsStr = `${formattedLat}, ${formattedLng}`;
    setFormData(prev => ({ ...prev, titik_koordinat: coordsStr }));
    setMapCenter([parseFloat(formattedLat), parseFloat(formattedLng)]);
  };

  // Handle OpenStreetMap location search
  const handleSearchMapLocation = async (e) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;
    setIsSearchingMap(true);
    setMapSearchResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&countrycodes=id&limit=5`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMapSearchResults(data);
        const first = data[0];
        updateCoordinates(parseFloat(first.lat), parseFloat(first.lon));
      } else {
        alert('Lokasi tidak ditemukan. Coba kata kunci yang lebih spesifik.');
      }
    } catch (err) {
      console.error('Search map location error:', err);
      alert('Gagal melakukan pencarian lokasi.');
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleSelectSearchResult = (res) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    updateCoordinates(lat, lng);
    setMapSearchResults([]);
    setMapSearchQuery(res.display_name);
  };

  // Load saved addresses on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedAddresses(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved addresses:", e);
    }
  }, [storageKey]);

  // Default to primary profile address if none selected yet
  useEffect(() => {
    if (!selectedAddress && profile) {
      const primaryAddr = {
        id: 'primary',
        label: 'Alamat Utama Profil',
        nama_penerima: profile.name_full || user?.name_full || user?.username || 'Pembeli',
        phone: profile.phone_number || profile.phone || user?.phone_number || '',
        alamat: profile.address || '',
        kelurahan: profile.address_village_name || profile.address_village_id || '',
        kecamatan: profile.address_subdistrict_name || '',
        kota: profile.address_city_name || '',
        provinsi: profile.address_province || '',
        kode_pos: profile.address_postal_code || '',
        detail_alamat: profile.address_detail || profile.notes || '',
        titik_koordinat: profile.coordinates || profile.lat_long || profile.address_latitude && profile.address_longitude ? `${profile.address_latitude}, ${profile.address_longitude}` : '',
        address_village_id: profile.address_village_id || profile.address_city_id || '',
        is_primary: true
      };
      onAddressSelect(primaryAddr);
    }
  }, [profile, selectedAddress, onAddressSelect, user]);

  const saveAddressesToStorage = (list) => {
    setSavedAddresses(list);
    localStorage.setItem(storageKey, JSON.stringify(list));
  };

  const handleOpenAddForm = () => {
    if (savedAddresses.length >= 5) {
      alert('Maksimal 5 alamat tersimpan tambahan telah tercapai.');
      return;
    }
    fetchProvinces();
    setMapSearchQuery('');
    setMapSearchResults([]);
    setEditingId(null);

    const initialForm = {
      ...defaultFormData,
      label: `Alamat Alternatif ${savedAddresses.length + 1}`,
      nama_penerima: profile?.name_full || '',
      phone: profile?.phone_number || profile?.phone || ''
    };
    setFormData(initialForm);

    const defaultCoords = profile?.address_latitude && profile?.address_longitude
      ? [parseFloat(profile.address_latitude), parseFloat(profile.address_longitude)]
      : [-6.914744, 107.609810];
    setMapCenter(defaultCoords);

    setShowFormModal(true);
  };

  const handleOpenEditForm = (addr, e) => {
    e.stopPropagation();
    fetchProvinces();
    setMapSearchQuery('');
    setMapSearchResults([]);
    setEditingId(addr.id);
    setFormData(addr);

    if (addr.address_province_id) fetchCities(addr.address_province_id);
    if (addr.address_city_id) fetchDistricts(addr.address_city_id);
    if (addr.address_subdistrict_id) fetchVillages(addr.address_subdistrict_id);

    const parsed = parseCoords(addr.titik_koordinat);
    if (parsed) {
      setMapCenter(parsed);
    } else {
      setMapCenter([-6.914744, 107.609810]);
    }
    setShowFormModal(true);
  };

  const handleDeleteAddress = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Hapus alamat ini dari daftar tersimpan?')) {
      const updated = savedAddresses.filter(a => a.id !== id);
      saveAddressesToStorage(updated);
      if (selectedAddress?.id === id) {
        onAddressSelect({
          id: 'primary',
          label: 'Alamat Utama Profil',
          nama_penerima: profile?.name_full || user?.username || 'Pembeli',
          phone: profile?.phone_number || profile?.phone || '',
          alamat: profile?.address || '',
          kelurahan: profile?.address_village_name || '',
          kecamatan: profile?.address_subdistrict_name || '',
          kota: profile?.address_city_name || '',
          provinsi: profile?.address_province || '',
          kode_pos: profile?.address_postal_code || '',
          detail_alamat: '',
          titik_koordinat: '',
          address_village_id: profile?.address_village_id || '',
          is_primary: true
        });
      }
    }
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.nama_penerima || !formData.phone || !formData.alamat || !formData.kota) {
      alert('Mohon isi Nama Penerima, No. Telp, Alamat Lengkap, dan Kota/Kabupaten.');
      return;
    }

    let updatedList = [...savedAddresses];
    let savedAddrObj = { ...formData };

    if (editingId) {
      updatedList = updatedList.map(a => a.id === editingId ? savedAddrObj : a);
    } else {
      savedAddrObj.id = 'addr_' + Date.now();
      updatedList.push(savedAddrObj);
    }

    saveAddressesToStorage(updatedList);
    onAddressSelect(savedAddrObj);
    setShowFormModal(false);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Fitur Geolocation/GPS tidak didukung oleh browser Anda.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateCoordinates(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error('GPS Error:', error);
        alert('Gagal mendapatkan lokasi GPS. Harap periksa izin lokasi di browser Anda.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const currentAddr = selectedAddress || {
    nama_penerima: profile?.name_full || 'Pembeli',
    phone: profile?.phone_number || profile?.phone || '-',
    alamat: profile?.address || 'Belum diisi',
    kota: profile?.address_city_name || '',
    provinsi: profile?.address_province || ''
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <span className="material-icons text-emerald-600 text-[18px]">location_on</span>
          Alamat Pengiriman Pemesan
        </h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-xs text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition flex items-center gap-1"
        >
          <span className="material-icons text-[14px]">swap_horiz</span>
          Pilih / Ubah Alamat
        </button>
      </div>

      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-bold text-sm text-gray-900">{currentAddr.nama_penerima}</span>
          <span className="text-xs font-semibold text-gray-600">({currentAddr.phone})</span>
          {currentAddr.is_primary && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Alamat Profil Utama</span>
          )}
          {currentAddr.label && !currentAddr.is_primary && (
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">{currentAddr.label}</span>
          )}
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{currentAddr.alamat}</p>
        <p className="text-xs text-gray-500 mt-1">
          {[currentAddr.kelurahan, currentAddr.kecamatan, currentAddr.kota, currentAddr.provinsi, currentAddr.kode_pos].filter(Boolean).join(', ')}
        </p>
        {currentAddr.detail_alamat && (
          <p className="text-[11px] text-amber-700 font-medium mt-1 bg-amber-50 px-2 py-1 rounded-lg">
            <strong>Catatan Patokan:</strong> {currentAddr.detail_alamat}
          </p>
        )}
        {currentAddr.titik_koordinat && (
          <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
            <span className="material-icons text-[13px]">my_location</span>
            <strong>Koordinat GPS:</strong> {currentAddr.titik_koordinat}
          </p>
        )}
      </div>

      {/* MODAL SELECTION */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 sm:p-4 pt-14 pb-16 sm:pt-4 sm:pb-4 overflow-hidden">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in">
            <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b bg-white shrink-0">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600">local_shipping</span>
                Pilih Alamat Pengiriman (Maks 5)
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            {/* Address List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {/* Primary Address */}
              <div
                onClick={() => {
                  onAddressSelect({
                    id: 'primary',
                    label: 'Alamat Utama Profil',
                    nama_penerima: profile?.name_full || user?.username || 'Pembeli',
                    phone: profile?.phone_number || profile?.phone || '',
                    alamat: profile?.address || '',
                    kelurahan: profile?.address_village_name || '',
                    kecamatan: profile?.address_subdistrict_name || '',
                    kota: profile?.address_city_name || '',
                    provinsi: profile?.address_province || '',
                    kode_pos: profile?.address_postal_code || '',
                    detail_alamat: '',
                    titik_koordinat: profile?.address_latitude && profile?.address_longitude ? `${profile.address_latitude}, ${profile.address_longitude}` : '',
                    address_village_id: profile?.address_village_id || '',
                    is_primary: true
                  });
                  setShowModal(false);
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedAddress?.id === 'primary' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase">Alamat Profil Utama</span>
                    <h4 className="font-bold text-sm text-gray-800 mt-1">{profile?.name_full || 'Pembeli'} ({profile?.phone || profile?.phone_number || '-'})</h4>
                    <p className="text-xs text-gray-600 mt-1">{profile?.address}</p>
                    <p className="text-xs text-gray-500">{[profile?.address_village_name, profile?.address_subdistrict_name, profile?.address_city_name, profile?.address_province].filter(Boolean).join(', ')}</p>
                  </div>
                  {selectedAddress?.id === 'primary' && <span className="material-icons text-emerald-600">check_circle</span>}
                </div>
              </div>

              {/* Saved Addresses */}
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    onAddressSelect(addr);
                    setShowModal(false);
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedAddress?.id === addr.id ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase">{addr.label || 'Alamat Tersimpan'}</span>
                      <h4 className="font-bold text-sm text-gray-800 mt-1">{addr.nama_penerima} ({addr.phone})</h4>
                      <p className="text-xs text-gray-600 mt-1">{addr.alamat}</p>
                      <p className="text-xs text-gray-500">{[addr.kelurahan, addr.kecamatan, addr.kota, addr.provinsi, addr.kode_pos].filter(Boolean).join(', ')}</p>
                      {addr.detail_alamat && <p className="text-[11px] text-amber-700 mt-1">Ket: {addr.detail_alamat}</p>}
                      {addr.titik_koordinat && <p className="text-[11px] text-blue-600 mt-0.5">GPS: {addr.titik_koordinat}</p>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button type="button" onClick={(e) => handleOpenEditForm(addr, e)} className="p-1 text-gray-500 hover:text-blue-600">
                        <span className="material-icons text-[18px]">edit</span>
                      </button>
                      <button type="button" onClick={(e) => handleDeleteAddress(addr.id, e)} className="p-1 text-gray-500 hover:text-red-600">
                        <span className="material-icons text-[18px]">delete</span>
                      </button>
                      {selectedAddress?.id === addr.id && <span className="material-icons text-emerald-600 ml-1">check_circle</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Button */}
            <div className="p-4 bg-gray-50 border-t shrink-0">
              <button
                type="button"
                onClick={handleOpenAddForm}
                disabled={savedAddresses.length >= 5}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">add_location_alt</span>
                Tambah Alamat Baru ({savedAddresses.length}/5 Tersimpan)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT) */}
      {showFormModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 sm:p-4 pt-14 pb-16 sm:pt-4 sm:pb-4 overflow-hidden">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in">
            {/* STICKY HEADER */}
            <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b bg-white shrink-0">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600 text-base sm:text-lg">edit_location</span>
                {editingId ? 'Edit Alamat Pengiriman' : 'Tambah Alamat Pengiriman Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowFormModal(false)} 
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <span className="material-icons text-xl sm:text-2xl">close</span>
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              <form id="shipping-address-form" onSubmit={handleSaveForm} className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Label Alamat (mis: Rumah, Kantor, Toko)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rumah Orang Tua"
                    value={formData.label}
                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                    className="w-full p-2 sm:p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Nama Penerima *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap penerima"
                      value={formData.nama_penerima}
                      onChange={e => setFormData({ ...formData, nama_penerima: e.target.value })}
                      className="w-full p-2 sm:p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">No. Telp / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2 sm:p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Alamat Lengkap (Jalan / No. Rumah) *</label>
                  <textarea
                    required
                    rows="2"
                    placeholder="Jl. Merdeka No. 123, RT 01/RW 02"
                    value={formData.alamat}
                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full p-2 sm:p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Administrative Regions Ordered High to Low */}
                <div className="space-y-2.5 sm:space-y-3 bg-gray-50/70 p-2.5 sm:p-3 rounded-2xl border border-gray-200/60">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <span className="material-icons text-[14px]">map</span>
                    Wilayah Pengiriman (Provinsi s/d Kelurahan)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* 1. Provinsi */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">1. Provinsi *</label>
                      <select
                        required
                        value={formData.address_province_id || ''}
                        onFocus={() => fetchProvinces()}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedObj = provinces.find(p => String(p.province_id) === String(selectedId));
                          const provName = selectedObj ? selectedObj.province : (formData.provinsi || '');
                          setFormData(prev => ({
                            ...prev,
                            address_province_id: selectedId,
                            provinsi: provName,
                            address_city_id: '', kota: '',
                            address_subdistrict_id: '', kecamatan: '',
                            address_village_id: '', kelurahan: ''
                          }));
                          setCities([]);
                          setDistricts([]);
                          setVillages([]);
                          if (selectedId) fetchCities(selectedId, true);
                        }}
                        className="w-full p-2 sm:p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Provinsi --</option>
                        {provinces.length === 0 && formData.provinsi && (
                          <option value={formData.address_province_id || 'custom'}>{formData.provinsi}</option>
                        )}
                        {provinces.map(p => (
                          <option key={p.province_id} value={p.province_id}>{p.province}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Kota / Kabupaten */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">2. Kota / Kabupaten *</label>
                      <select
                        required
                        disabled={!formData.address_province_id && !formData.provinsi}
                        value={formData.address_city_id || ''}
                        onFocus={() => fetchCities(formData.address_province_id)}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedObj = cities.find(c => String(c.city_id) === String(selectedId));
                          const cityName = selectedObj ? `${selectedObj.type} ${selectedObj.city_name}` : (formData.kota || '');
                          setFormData(prev => ({
                            ...prev,
                            address_city_id: selectedId,
                            kota: cityName,
                            address_subdistrict_id: '', kecamatan: '',
                            address_village_id: '', kelurahan: ''
                          }));
                          setDistricts([]);
                          setVillages([]);
                          if (selectedId) fetchDistricts(selectedId, true);
                        }}
                        className="w-full p-2 sm:p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:opacity-70"
                      >
                        <option value="">{loadingCities ? 'Memuat Kota...' : '-- Pilih Kota / Kabupaten --'}</option>
                        {cities.length === 0 && formData.kota && (
                          <option value={formData.address_city_id || 'custom'}>{formData.kota}</option>
                        )}
                        {cities.map(c => (
                          <option key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Kecamatan */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">3. Kecamatan</label>
                      <select
                        disabled={!formData.address_city_id && !formData.kota}
                        value={formData.address_subdistrict_id || ''}
                        onFocus={() => fetchDistricts(formData.address_city_id)}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedObj = districts.find(d => String(d.district_id) === String(selectedId));
                          const distName = selectedObj ? selectedObj.district_name : (formData.kecamatan || '');
                          setFormData(prev => ({
                            ...prev,
                            address_subdistrict_id: selectedId,
                            kecamatan: distName,
                            address_village_id: '', kelurahan: ''
                          }));
                          setVillages([]);
                          if (selectedId) fetchVillages(selectedId, true);
                        }}
                        className="w-full p-2 sm:p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:opacity-70"
                      >
                        <option value="">{loadingDistricts ? 'Memuat Kecamatan...' : '-- Pilih Kecamatan --'}</option>
                        {districts.length === 0 && formData.kecamatan && (
                          <option value={formData.address_subdistrict_id || 'custom'}>{formData.kecamatan}</option>
                        )}
                        {districts.map(d => (
                          <option key={d.district_id} value={d.district_id}>{d.district_name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Kelurahan / Desa */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">4. Kelurahan / Desa</label>
                      <select
                        disabled={!formData.address_subdistrict_id && !formData.kecamatan}
                        value={formData.address_village_id || ''}
                        onFocus={() => fetchVillages(formData.address_subdistrict_id)}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedObj = villages.find(v => String(v.village_id) === String(selectedId));
                          const villageName = selectedObj ? selectedObj.village_name : (formData.kelurahan || '');
                          setFormData(prev => ({
                            ...prev,
                            address_village_id: selectedId,
                            kelurahan: villageName
                          }));
                        }}
                        className="w-full p-2 sm:p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:opacity-70"
                      >
                        <option value="">{loadingVillages ? 'Memuat Kelurahan...' : '-- Pilih Kelurahan / Desa --'}</option>
                        {villages.length === 0 && formData.kelurahan && (
                          <option value={formData.address_village_id || 'custom'}>{formData.kelurahan}</option>
                        )}
                        {villages.map(v => (
                          <option key={v.village_id} value={v.village_id}>{v.village_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. Kode Pos */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Kode Pos</label>
                    <input
                      type="text"
                      placeholder="Contoh: 40123"
                      value={formData.kode_pos}
                      onChange={e => setFormData({ ...formData, kode_pos: e.target.value })}
                      className="w-full p-2 sm:p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Detail Alamat Lainnya (Patokan)</label>
                  <input
                    type="text"
                    placeholder="Dekat masjid, pagar warna hijau..."
                    value={formData.detail_alamat}
                    onChange={e => setFormData({ ...formData, detail_alamat: e.target.value })}
                    className="w-full p-2 sm:p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Interactive Maps Picker & Search */}
                <div className="pt-2 border-t border-gray-100 mt-3 sm:mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                    <label className="block text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1.5">
                      <span className="material-icons text-emerald-600 text-sm sm:text-[16px]">pin_drop</span>
                      Titik Koordinat Lokasi (Peta Interaktif GPS)
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={isLocating}
                      className="text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition self-start sm:self-auto"
                    >
                      <span className="material-icons text-[12px]">my_location</span>
                      {isLocating ? 'Mendeteksi...' : 'Lokasi Saya Saat Ini'}
                    </button>
                  </div>

                  {/* Search Box on Map */}
                  <div className="relative mb-2">
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <span className="material-icons absolute left-2.5 top-2 text-gray-400 text-sm sm:text-[16px]">search</span>
                        <input
                          type="text"
                          placeholder="Cari nama lokasi / jalan di peta..."
                          value={mapSearchQuery}
                          onChange={(e) => setMapSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchMapLocation();
                            }
                          }}
                          className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchMapLocation}
                        disabled={isSearchingMap}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shrink-0 flex items-center gap-1"
                      >
                        {isSearchingMap ? (
                          <span className="animate-spin text-xs">...</span>
                        ) : (
                          <>
                            <span className="material-icons text-xs sm:text-[14px]">travel_explore</span>
                            Cari
                          </>
                        )}
                      </button>
                    </div>

                    {/* Search Results Dropdown List */}
                    {mapSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                        {mapSearchResults.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectSearchResult(item)}
                            className="p-2 sm:p-2.5 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 text-xs text-gray-700 flex items-start gap-2"
                          >
                            <span className="material-icons text-emerald-600 text-sm shrink-0 mt-0.5">place</span>
                            <span className="leading-tight">{item.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leaflet Map Component */}
                  <div className="h-44 sm:h-52 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200 relative z-0 mb-2 shadow-inner">
                    <MapContainer
                      center={mapCenter}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <MapController center={mapCenter} />
                      <MapClickHandler onSelectLocation={(lat, lng) => updateCoordinates(lat, lng)} />
                      {mapCenter && mapCenter[0] && mapCenter[1] && (
                        <Marker position={mapCenter} />
                      )}
                    </MapContainer>
                  </div>

                  <input
                    type="text"
                    placeholder="-6.175392, 106.827153 (Latitude, Longitude)"
                    value={formData.titik_koordinat}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, titik_koordinat: val }));
                      const parsed = parseCoords(val);
                      if (parsed) setMapCenter(parsed);
                    }}
                    className="w-full p-2 bg-gray-50 border rounded-xl text-xs font-mono text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">
                    * Klik pada peta untuk memilih titik lokasi secara presisi, atau gunakan pencarian alamat di atas.
                  </p>
                </div>
              </form>
            </div>

            {/* STICKY FOOTER */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="w-1/2 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="shipping-address-form"
                className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-sm"
              >
                Simpan Alamat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingAddressSelector;
