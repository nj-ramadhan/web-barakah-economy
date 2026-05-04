import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import businessProfileService from '../services/businessProfile';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const BusinessDataFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        community_username: '',
        whatsapp: '',
        brand_name: '',
        business_field: 'kuliner',
        business_field_other: '',
        description: '',
        main_products: '',
        business_scale: '<1jt',
        keunggulan: '',
        target_market: '',
        instagram: '',
        website: '',
        marketplace: '',
        customer_contact: '',
        business_status: 'baru',
        sales_area: 'lokal',
        readiness_order: 'siap',
        display_name: '',
        tagline: '',
        promo_description: '',
        display_contact: '',
        is_website_display_approved: false,
        business_needs: [],
        business_needs_other: '',
        expectations: ''
    });

    const [files, setFiles] = useState({
        logo: null,
        foto_produk_1: null,
        foto_produk_2: null,
        foto_produk_3: null
    });

    const [previews, setPreviews] = useState({
        logo: null,
        foto_produk_1: null,
        foto_produk_2: null,
        foto_produk_3: null
    });

    useEffect(() => {
        if (id) {
            fetchData();
        } else {
            // Pre-fill from user profile
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    full_name: user.name_full || '',
                    community_username: user.username || '',
                    whatsapp: user.phone || ''
                }));
            }
        }
    }, [id]);

    const fetchData = async () => {
        setFetching(true);
        try {
            const res = await businessProfileService.getBusinessProfile(id);
            setFormData(res.data);
            setPreviews({
                logo: res.data.logo,
                foto_produk_1: res.data.foto_produk_1,
                foto_produk_2: res.data.foto_produk_2,
                foto_produk_3: res.data.foto_produk_3
            });
        } catch (err) {
            console.error('Failed to fetch data:', err);
            alert('Gagal mengambil data usaha');
            navigate('/dashboard/business-data');
        } finally {
            setFetching(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'business_needs') {
            const currentNeeds = [...formData.business_needs];
            if (checked) {
                currentNeeds.push(value);
            } else {
                const index = currentNeeds.indexOf(value);
                if (index > -1) currentNeeds.splice(index, 1);
            }
            setFormData({ ...formData, business_needs: currentNeeds });
        } else {
            setFormData({
                ...formData,
                [name]: type === 'checkbox' ? checked : value
            });
        }
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        const file = selectedFiles[0];
        if (file) {
            setFiles({ ...files, [name]: file });
            setPreviews({ ...previews, [name]: URL.createObjectURL(file) });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'business_needs') {
                data.append(key, JSON.stringify(formData[key] || []));
            } else if (formData[key] !== null && formData[key] !== undefined) {
                data.append(key, formData[key]);
            }
        });

        Object.keys(files).forEach(key => {
            if (files[key]) {
                data.append(key, files[key]);
            }
        });

        try {
            if (id) {
                await businessProfileService.updateBusinessProfile(id, data);
            } else {
                await businessProfileService.createBusinessProfile(data);
            }
            alert('Data usaha berhasil disimpan!');
            navigate('/dashboard/business-data');
        } catch (err) {
            console.error('Failed to save data:', err);
            alert(err.response?.data?.detail || 'Gagal menyimpan data usaha. Pastikan semua file wajib sudah diisi.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="mb-8">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-green-600 flex items-center gap-2 mb-4 transition">
                        <span className="material-icons text-sm">arrow_back</span>
                        <span className="text-sm font-bold uppercase tracking-widest">Kembali</span>
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Form Pendataan Partner Bisnis</h1>
                    <p className="text-gray-500 mt-2">Lengkapi data usaha Anda untuk publikasi di BAE Community</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* SECTION 1 — DATA ANGGOTA */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-green-700">person</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 1 — DATA ANGGOTA</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required name="full_name" value={formData.full_name} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Username Komunitas</label>
                                <input
                                    type="text" name="community_username" value={formData.community_username} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nomor WhatsApp Aktif <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required name="whatsapp" value={formData.whatsapp} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2 — DATA BISNIS */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-blue-700">store</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 2 — DATA BISNIS</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nama Brand / Usaha <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required name="brand_name" value={formData.brand_name} onChange={handleInputChange}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bidang Usaha <span className="text-red-500">*</span></label>
                                    <select
                                        name="business_field" value={formData.business_field} onChange={handleInputChange}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    >
                                        <option value="kuliner">Kuliner</option>
                                        <option value="fashion">Fashion</option>
                                        <option value="jasa">Jasa</option>
                                        <option value="digital">Digital</option>
                                        <option value="kesehatan">Kesehatan</option>
                                        <option value="pendidikan">Pendidikan</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                    {formData.business_field === 'lainnya' && (
                                        <input
                                            type="text" name="business_field_other" value={formData.business_field_other} onChange={handleInputChange}
                                            placeholder="Sebutkan bidang usaha lainnya..."
                                            className="w-full mt-3 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Deskripsi Singkat Usaha <span className="text-red-500">*</span> (Maks. 150 kata)</label>
                                <textarea
                                    required name="description" value={formData.description} onChange={handleInputChange} rows="4"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Jenis Produk / Jasa Utama <span className="text-red-500">*</span></label>
                                <select
                                    required name="main_products" value={formData.main_products} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                >
                                    <option value="" disabled>Pilih Jenis Utama</option>
                                    <option value="Produk (Fisik/Digital)">Produk (Fisik / Digital)</option>
                                    <option value="Jasa (Layanan)">Jasa (Layanan)</option>
                                    <option value="Produk & Jasa">Keduanya (Produk & Jasa)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Skala Usaha (Omzet Rata-rata per Bulan) <span className="text-red-500">*</span></label>
                                <select
                                    name="business_scale" value={formData.business_scale} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                >
                                    <option value="<1jt">&lt; Rp1 juta</option>
                                    <option value="1-5jt">Rp1 – 5 juta</option>
                                    <option value="5-10jt">Rp5 – 10 juta</option>
                                    <option value="10-25jt">Rp10 – 25 juta</option>
                                    <option value="25-50jt">Rp25 – 50 juta</option>
                                    <option value="50-100jt">Rp50 – 100 juta</option>
                                    <option value="100-250jt">Rp100 – 250 juta</option>
                                    <option value=">250jt">&gt; Rp250 juta</option>
                                </select>
                                <p className="text-[10px] text-gray-400 mt-2 italic">* Data ini digunakan untuk kebutuhan kurasi dan pengembangan komunitas (tidak ditampilkan publik)</p>
                            </div>

                            <div className="pt-6 border-t border-gray-50">
                                <h3 className="text-sm font-black text-gray-700 mb-4">🎯 Positioning & Kekuatan Bisnis</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Keunggulan Utama Bisnis <span className="text-red-500">*</span> (Maks. 100 kata)</label>
                                        <textarea
                                            required name="keunggulan" value={formData.keunggulan} onChange={handleInputChange} rows="3"
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Market Utama <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" required name="target_market" value={formData.target_market} onChange={handleInputChange}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3 — MEDIA & KONTAK */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-purple-700">link</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 3 — MEDIA & KONTAK</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Instagram Bisnis</label>
                                <input
                                    type="text" name="instagram" value={formData.instagram} onChange={handleInputChange}
                                    placeholder="@brand.usaha"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Website (jika ada)</label>
                                <input
                                    type="url" name="website" value={formData.website} onChange={handleInputChange}
                                    placeholder="https://..."
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Marketplace (Shopee / Tokopedia / dll)</label>
                                <input
                                    type="text" name="marketplace" value={formData.marketplace} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nomor Kontak Pelanggan <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required name="customer_contact" value={formData.customer_contact} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-purple-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4 — MEDIA UNTUK WEBSITE */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-orange-700">image</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 4 — MEDIA UNTUK WEBSITE</h2>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Upload Logo Bisnis <span className="text-red-500">*</span> (PNG/JPG)</label>
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        {previews.logo ? <img src={previews.logo} className="w-full h-full object-cover" /> : <span className="material-icons text-gray-300 text-3xl">add_photo_alternate</span>}
                                    </div>
                                    <input type="file" name="logo" required={!id} onChange={handleFileChange} className="text-xs" accept="image/*" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Upload Foto Produk / Jasa <span className="text-red-500">*</span> (Min. 1, Maks. 3)</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {['foto_produk_1', 'foto_produk_2', 'foto_produk_3'].map((name, i) => (
                                        <div key={name} className="space-y-4">
                                            <div className="aspect-square bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                                                {previews[name] ? <img src={previews[name]} className="w-full h-full object-cover" /> : <span className="material-icons text-gray-300 text-3xl">add_photo_alternate</span>}
                                            </div>
                                            <input type="file" name={name} required={i === 0 && !id} onChange={handleFileChange} className="text-[10px]" accept="image/*" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5 — STATUS & KESIAPAN */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-teal-700">fact_check</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 5 — STATUS & KESIAPAN</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status Usaha <span className="text-red-500">*</span></label>
                                <select
                                    name="business_status" value={formData.business_status} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-teal-500 transition"
                                >
                                    <option value="baru">Baru mulai</option>
                                    <option value="berjalan">Sudah berjalan</option>
                                    <option value="stabil">Sudah stabil</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Area Penjualan <span className="text-red-500">*</span></label>
                                <select
                                    name="sales_area" value={formData.sales_area} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-teal-500 transition"
                                >
                                    <option value="lokal">Lokal</option>
                                    <option value="nasional">Nasional</option>
                                    <option value="internasional">Internasional</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kesiapan Order <span className="text-red-500">*</span></label>
                                <select
                                    name="readiness_order" value={formData.readiness_order} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-teal-500 transition"
                                >
                                    <option value="siap">Siap</option>
                                    <option value="belum_siap">Belum siap</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 6 — DATA UNTUK WEBSITE (DISPLAY PUBLIK) */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-indigo-700">web</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 6 — DATA WEBSITE (PUBLIK)</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nama Bisnis Display <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required name="display_name" value={formData.display_name} onChange={handleInputChange}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tagline / Slogan</label>
                                    <input
                                        type="text" name="tagline" value={formData.tagline} onChange={handleInputChange}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Deskripsi Promosi Web <span className="text-red-500">*</span> (Maks. 100 kata)</label>
                                <textarea
                                    required name="promo_description" value={formData.promo_description} onChange={handleInputChange} rows="3"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kontak yang Ditampilkan <span className="text-red-500">*</span> (WA / IG / Web)</label>
                                <input
                                    type="text" required name="display_contact" value={formData.display_contact} onChange={handleInputChange}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-indigo-500 transition"
                                />
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 p-6 rounded-2xl border border-indigo-50">
                                <input
                                    type="checkbox" id="is_website_display_approved" name="is_website_display_approved"
                                    checked={formData.is_website_display_approved} onChange={handleInputChange}
                                    className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="is_website_display_approved" className="text-sm font-bold text-gray-700">Setuju data di atas ditampilkan di Website BAE Community</label>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 7 — TAMBAHAN (OPSIONAL) */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-pink-700">add_task</span>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">SECTION 7 — TAMBAHAN</h2>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Kebutuhan Bisnis Saat Ini</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {['Modal', 'Marketing', 'Tim / SDM', 'Mentoring', 'Networking'].map(need => (
                                        <label key={need} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                                            <input
                                                type="checkbox" name="business_needs" value={need}
                                                checked={formData.business_needs.includes(need)} onChange={handleInputChange}
                                                className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{need}</span>
                                        </label>
                                    ))}
                                </div>
                                <input
                                    type="text" name="business_needs_other" value={formData.business_needs_other} onChange={handleInputChange}
                                    placeholder="Lainnya: ___"
                                    className="w-full mt-4 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-pink-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Harapan untuk BAE Community</label>
                                <textarea
                                    name="expectations" value={formData.expectations} onChange={handleInputChange} rows="3"
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-pink-500 transition"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-green-700 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-green-100 hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
                            {id ? 'SIMPAN PERUBAHAN' : 'KIRIM PENDATAAN USAHA'}
                        </button>
                    </div>
                </form>
            </div>
            <NavigationButton />
        </div>
    );
};

export default BusinessDataFormPage;
