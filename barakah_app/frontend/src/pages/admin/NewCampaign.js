// pages/admin/NewCampaign.js
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageCropperModal from '../../components/common/ImageCropper';
import CurrencyInput from '../../components/common/CurrencyInput';

const NewCampaign = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [cropper, setCropper] = useState({ active: false, image: null });
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    targetAmount: '',
    thumbnail: null,
    isActive: true,
    isFeatured: false
  });

  const categoryAdditionalAmounts = {
    infak: { value: 25 }, sedekah: { value: 50 }, zakat: { value: 75 }, donasi: { value: 100 },
    bencana: { value: 125 }, kemanusiaan: { value: 150 }, kesehatan: { value: 175 }, lingkungan: { value: 200 },
    pembangunan: { value: 225 }, sosial: { value: 250 }, lainnya: { value: 275 }, default: { value: 300 }
  };
  
  const categories = [
    { value: 'infak', label: 'Infak Barakah' },
    { value: 'sedekah', label: 'Sedekah Barakah' },
    { value: 'zakat', label: 'Zakat Barakah' },
    { value: 'donasi', label: 'Donasi Barakah' },
    { value: 'bencana', label: 'Bantuan Bencana Alam' },
    { value: 'kemanusiaan', label: 'Bantuan Kemanusiaan' },
    { value: 'kesehatan', label: 'Bantuan Kesehatan' },
    { value: 'lingkungan', label: 'Bantuan Lingkungan' },
    { value: 'pembangunan', label: 'Bantuan Pembangunan' },
    { value: 'sosial', label: 'Bantuan Sosial' },
    { value: 'lainnya', label: 'Lainnya' },
  ].map(c => ({
      ...c,
      label: `${c.label} - ${categoryAdditionalAmounts[c.value]?.value || 300}`
  }));

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      if (files && files[0]) {
        if (files[0].size > 5 * 1024 * 1024) {
          alert('Ukuran file terlalu besar. Maksimal 5MB.');
          e.target.value = ''; // Reset input
          return;
        }
        
        // Open Cropper instead of direct preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setCropper({ active: true, image: e.target.result });
        };
        reader.readAsDataURL(files[0]);
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create form data for multipart submission
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      alert('Program berhasil ditambahkan!');
      navigate('/admin/campaigns');
      
    } catch (error) {
      console.error('Error adding campaign:', error);
      alert('Gagal menambahkan program. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Admin Header */}
      <header className="bg-green-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">YPMN Admin Panel</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Admin</span>
            <button className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Tambah Program Baru</h2>
          <button 
            onClick={() => navigate('/admin/campaigns')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Kembali
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Contoh: Peduli Dhuafa Ramadhan 2025"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Donasi <span className="text-red-500">*</span>
                  </label>
                  <CurrencyInput
                    name="targetAmount"
                    required
                    value={formData.targetAmount}
                    onChange={handleInputChange}
                    placeholder="1000000"
                    className="!rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Masukkan jumlah target donasi program ini.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gambar Thumbnail <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex items-center">
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 w-full flex flex-col items-center justify-center ${
                        previewImage ? 'border-green-200 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {previewImage ? (
                        <div className="relative">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="h-40 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage(null);
                              setFormData(prev => ({ ...prev, thumbnail: null }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500">Klik untuk upload gambar</p>
                          <p className="text-xs text-gray-400">PNG, JPG atau JPEG (maks. 5MB)</p>
                        </>
                      )}
                      <input
                        type="file"
                        name="thumbnail"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={!previewImage}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi Program <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    rows="9"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Deskripsi detail tentang program ini..."
                    value={formData.description}
                    onChange={handleInputChange}
                  ></textarea>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Aktifkan program
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-700">
                      Tampilkan di featured slider
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/admin/campaigns')}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md mr-3 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md text-white font-medium ${
                  isSubmitting ? 'bg-green-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </div>
                ) : 'Simpan Program'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {cropper.active && (
        <ImageCropperModal 
          image={cropper.image}
          aspect={16 / 9}
          maxWidth={1280}
          maxHeight={720}
          onCropComplete={(croppedBlob) => {
            const file = new File([croppedBlob], 'campaign_thumb.jpg', { type: 'image/jpeg' });
            
            setFormData(prev => ({ ...prev, thumbnail: file }));
            setPreviewImage(URL.createObjectURL(croppedBlob));
            setCropper({ active: false, image: null });
          }}
          onCancel={() => {
            setCropper({ active: false, image: null });
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      )}
    </div>
  );
};

export default NewCampaign;