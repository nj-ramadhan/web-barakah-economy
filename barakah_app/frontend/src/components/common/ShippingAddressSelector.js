import React, { useState, useEffect } from 'react';

const ShippingAddressSelector = ({ profile, onAddressSelect, selectedAddress }) => {
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const storageKey = user?.id ? `barakah_saved_addresses_${user.id}` : 'barakah_saved_addresses_guest';

  // Form State
  const defaultFormData = {
    id: null,
    label: '',
    nama_penerima: '',
    phone: '',
    alamat: '',
    kelurahan: '',
    kecamatan: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
    detail_alamat: '',
    titik_koordinat: '',
    address_village_id: ''
  };

  const [formData, setFormData] = useState(defaultFormData);

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
        titik_koordinat: profile.coordinates || profile.lat_long || '',
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
    setEditingId(null);
    setFormData({
      ...defaultFormData,
      label: `Alamat Alternatif ${savedAddresses.length + 1}`,
      nama_penerima: profile?.name_full || '',
      phone: profile?.phone_number || profile?.phone || ''
    });
    setShowFormModal(true);
  };

  const handleOpenEditForm = (addr, e) => {
    e.stopPropagation();
    setEditingId(addr.id);
    setFormData(addr);
    setShowFormModal(true);
  };

  const handleDeleteAddress = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Hapus alamat ini dari daftar tersimpan?')) {
      const updated = savedAddresses.filter(a => a.id !== id);
      saveAddressesToStorage(updated);
      if (selectedAddress?.id === id) {
        // Fallback to primary address
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
      alert('Mohon isi Nama Penerima, No. Telp, Alamat Lengkap, dan Kota.');
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
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const coords = `${lat}, ${lng}`;
        setFormData(prev => ({ ...prev, titik_koordinat: coords }));
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600">local_shipping</span>
                Pilih Alamat Pengiriman (Maks 5)
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Address List */}
            <div className="space-y-3 mb-4">
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
                    titik_koordinat: '',
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
            <div className="flex gap-2 pt-2 border-t">
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
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600">edit_location</span>
                {editingId ? 'Edit Alamat Pengiriman' : 'Tambah Alamat Pengiriman Baru'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Label Alamat (mis: Rumah, Kantor, Toko)</label>
                <input
                  type="text"
                  placeholder="Contoh: Rumah Orang Tua"
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Nama Penerima *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap penerima"
                    value={formData.nama_penerima}
                    onChange={e => setFormData({ ...formData, nama_penerima: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">No. Telp / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Alamat Lengkap (Jalan / No. Rumah) *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Jl. Merdeka No. 123, RT 01/RW 02"
                  value={formData.alamat}
                  onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    placeholder="Nama Kelurahan"
                    value={formData.kelurahan}
                    onChange={e => setFormData({ ...formData, kelurahan: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Kecamatan</label>
                  <input
                    type="text"
                    placeholder="Nama Kecamatan"
                    value={formData.kecamatan}
                    onChange={e => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Kota / Kab *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kota/Kab"
                    value={formData.kota}
                    onChange={e => setFormData({ ...formData, kota: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Provinsi</label>
                  <input
                    type="text"
                    placeholder="Provinsi"
                    value={formData.provinsi}
                    onChange={e => setFormData({ ...formData, provinsi: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Kode Pos</label>
                  <input
                    type="text"
                    placeholder="12345"
                    value={formData.kode_pos}
                    onChange={e => setFormData({ ...formData, kode_pos: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Detail Alamat Lainnya (Patokan)</label>
                <input
                  type="text"
                  placeholder="Dekat masjid, pagar warna hijau..."
                  value={formData.detail_alamat}
                  onChange={e => setFormData({ ...formData, detail_alamat: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase">Titik Koordinat Lokasi (GPS)</label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLocating}
                    className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1"
                  >
                    <span className="material-icons text-[12px]">gps_fixed</span>
                    {isLocating ? 'Deteksi...' : 'Ambil Lokasi Saya'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="-6.175392, 106.827153 (Latitude, Longitude)"
                  value={formData.titik_koordinat}
                  onChange={e => setFormData({ ...formData, titik_koordinat: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[9px] text-gray-400 mt-1">Koordinat diperlukan agar lokasi pengiriman lebih akurat.</p>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="w-1/2 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
                >
                  Simpan Alamat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingAddressSelector;
