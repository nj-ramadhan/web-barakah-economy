import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';
import ShopDecoration from '../components/profile/ShopDecoration';
import StoreTemplates from '../components/profile/StoreTemplates';
import authService from '../services/auth';
import '../styles/Body.css';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}${url}`;
};

const DashboardShopSettingsPage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        username: '',
        picture: null,
        shop_thumbnail: null,
        shop_description: '',
        shop_layout: 'default',
        shop_theme_color: 'green',
        shop_font: 'sans',
        shop_decoration: 'none',
        shop_template: 'none',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cropper, setCropper] = useState({ active: false, image: null });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user && user.id) {
                    const profileData = await authService.getProfile(user.id);
                    setProfile({
                        username: profileData.username || '',
                        picture: profileData.picture || null,
                        shop_thumbnail: profileData.shop_thumbnail || null,
                        shop_description: profileData.shop_description || '',
                        shop_layout: profileData.shop_layout || 'default',
                        shop_theme_color: profileData.shop_theme_color || 'green',
                        shop_font: profileData.shop_font || 'sans',
                        shop_decoration: profileData.shop_decoration || 'none',
                        shop_template: profileData.shop_template || 'none',
                    });
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (profile.shop_thumbnail instanceof File && profile.shop_thumbnail.size > 5 * 1024 * 1024) {
            alert('File thumbnail toko terlalu besar (Maks 5MB)');
            return;
        }

        setSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.id) {
                const formData = new FormData();

                formData.append('shop_description', profile.shop_description);
                formData.append('shop_layout', profile.shop_layout);
                formData.append('shop_theme_color', profile.shop_theme_color);
                formData.append('shop_font', profile.shop_font);
                formData.append('shop_decoration', profile.shop_decoration);
                formData.append('shop_template', profile.shop_template);

                if (profile.shop_thumbnail instanceof File) {
                    formData.append('shop_thumbnail', profile.shop_thumbnail);
                }

                await authService.updateProfile(user.id, formData);
                alert('Pengaturan Toko berhasil disimpan');
            }
        } catch (error) {
            console.error('Failed to update shop settings:', error);
            alert('Gagal menyimpan pengaturan toko');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="body">
                <Header />
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                </div>
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>Pengaturan Toko - Dashboard</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-6">
                    <BackButton />
                    <div>
                        <h1 className="text-xl font-bold">Pengaturan Toko</h1>
                        <p className="text-xs text-gray-500">Sesuaikan tampilan toko digital Anda</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                        {/* Settings Form */}
                        <div className="flex-1 space-y-5">
                            <div className="mb-4">
                                <p className="text-xs text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="font-bold">Info:</span> Perubahan di bawah ini akan langsung tampil di halaman publik profil penjual Anda.
                                </p>
                            </div>

                            {/* Shop Thumbnail */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Thumbnail Toko</label>
                                <div className="flex flex-col space-y-3">
                                    {profile.shop_thumbnail && (
                                        <div className="w-full h-40 rounded-xl overflow-hidden border bg-gray-50">
                                            <img
                                                src={profile.shop_thumbnail instanceof File ? URL.createObjectURL(profile.shop_thumbnail) : profile.shop_thumbnail}
                                                alt="Shop Thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert('Ukuran gambar maksimal 5MB');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setCropper({ active: true, image: ev.target.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Shop Description */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Deskripsi Toko</label>
                                <textarea
                                    name="shop_description"
                                    placeholder="Jelaskan spesialisasi atau deskripsi toko digital Anda"
                                    value={profile.shop_description || ''}
                                    onChange={handleChange}
                                    rows="4"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* Shop Layout */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Layout Toko</label>
                                <select
                                    name="shop_layout"
                                    value={profile.shop_layout || 'default'}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="default">Default List</option>
                                    <option value="grid">Grid Minimalis</option>
                                    <option value="biolink">Bio Link Style (Pusat)</option>
                                </select>
                            </div>

                            {/* Shop Theme Color */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Tema Warna</label>
                                <div className="flex gap-2 flex-wrap mb-3">
                                    {['green', 'blue', 'purple', 'dark', 'rose'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, shop_theme_color: color }))}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold border ${profile.shop_theme_color === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-200'} capitalize transition`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={profile.shop_theme_color?.startsWith('#') ? profile.shop_theme_color : '#166534'}
                                        onChange={(e) => setProfile(prev => ({ ...prev, shop_theme_color: e.target.value }))}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 shadow-sm"
                                        title="Pilih Warna Custom"
                                    />
                                    <input
                                        type="text"
                                        placeholder="# HEX / rgb()"
                                        value={profile.shop_theme_color || 'green'}
                                        onChange={(e) => setProfile(prev => ({ ...prev, shop_theme_color: e.target.value }))}
                                        className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold uppercase focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Shop Font */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Jenis Font</label>
                                <select
                                    name="shop_font"
                                    value={profile.shop_font || 'sans'}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="sans">Modern Sans (Default)</option>
                                    <option value="serif">Classic Serif</option>
                                    <option value="mono">Tech Mono</option>
                                    <option value="poppins">Poppins (Friendly)</option>
                                </select>
                            </div>


                            {/* Shop Decoration */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Dekorasi Background</label>
                                <select
                                    name="shop_decoration"
                                    value={profile.shop_decoration || 'none'}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="none">Tanpa Dekorasi</option>
                                    <option value="islamic">Islamic - Ramadan</option>
                                    <option value="clouds">Awan Lembut</option>
                                </select>
                            </div>

                            {/* Shop Template Selection */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Template Toko Khusus</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'none', name: 'Standard (Default)', color: 'bg-gray-100' },
                                        { id: 'hijrah_elegan', name: 'Hijrah Elegan', color: 'bg-emerald-800' },
                                        { id: 'ketenangan_senja', name: 'Ketenangan Senja', color: 'bg-orange-500' },
                                        { id: 'aesthetic_lofi', name: 'Aesthetic LoFi', color: 'bg-[#f4f1ea]' },
                                    ].map((tmpl) => (
                                        <button
                                            key={tmpl.id}
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, shop_template: tmpl.id }))}
                                            className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${profile.shop_template === tmpl.id ? 'border-green-600 bg-green-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                        >
                                            <div className={`w-full aspect-video rounded-lg ${tmpl.color} flex items-center justify-center text-white text-[10px] font-bold shadow-inner`}>
                                                {tmpl.id === 'none' ? 'Barakah Standard' : 'Premium'}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-600">{tmpl.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">* Memilih template khusus akan menimpa pengaturan Layout & Warna di bawah ini.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-green-700 text-white rounded-xl py-4 font-bold shadow-lg hover:bg-green-800 transition disabled:opacity-50 mt-4"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
                            </button>
                        </div>

                        {/* Live Preview Box */}
                        <div className="w-full lg:w-[350px] flex-shrink-0 bg-gray-50 rounded-2xl p-4 border flex flex-col items-center">
                            <h4 className="text-xs font-bold text-gray-400 mb-4 w-full text-center tracking-widest uppercase">Live Preview (Mobile)</h4>

                            <div className={`w-full bg-white rounded-[2.5rem] shadow-sm border-[6px] border-gray-200 overflow-hidden relative h-[650px] flex flex-col ${profile.shop_font === 'serif' ? 'font-serif' : profile.shop_font === 'mono' ? 'font-mono' : profile.shop_font === 'poppins' ? 'font-[Poppins]' : 'font-sans'}`}>
                                {profile.shop_template !== 'none' ? (
                                    <StoreTemplates
                                        templateName={profile.shop_template}
                                        profile={profile}
                                        username={profile.username}
                                        isPreview={true}
                                        themeColor={profile.shop_theme_color}
                                        font={profile.shop_font}
                                        decoration={profile.shop_decoration}
                                        layout={profile.shop_layout || 'default'}
                                        products={[
                                            { title: 'Produk Digital 1', price: 50000, thumbnail: 'https://barakah.cloud/media/products/course_social_media.jpg', category: 'Marketing' },
                                            { title: 'Produk Digital 2', price: 75000, thumbnail: 'https://barakah.cloud/media/products/design_bundle.jpg', category: 'Design' }
                                        ]}
                                        courses={[
                                            { title: 'E-Course Premium', price: 150000, thumbnail: 'https://barakah.cloud/media/courses/digital_marketing.jpg', student_count: 120 }
                                        ]}
                                    />
                                ) : (
                                    <>
                                        {/* Decoration Overlay */}
                                        <ShopDecoration decoration={profile.shop_decoration} themeColor={profile.shop_theme_color} isPreview={true} />

                                        {/* Header bg / Shop Thumbnail */}
                                        <div
                                            className={`h-32 w-full relative z-10 overflow-hidden ${!profile.shop_thumbnail && (profile.shop_theme_color === 'dark' ? 'bg-gray-900' : profile.shop_theme_color === 'blue' ? 'bg-blue-800' : profile.shop_theme_color === 'purple' ? 'bg-purple-800' : profile.shop_theme_color === 'rose' ? 'bg-rose-800' : profile.shop_theme_color === 'green' ? 'bg-green-800' : 'bg-gray-800')}`}
                                            style={{ backgroundColor: (!profile.shop_thumbnail && (profile.shop_theme_color?.startsWith('#') || profile.shop_theme_color?.startsWith('rgb'))) ? profile.shop_theme_color : undefined }}
                                        >
                                            {profile.shop_thumbnail && (
                                                <img
                                                    src={profile.shop_thumbnail instanceof File ? URL.createObjectURL(profile.shop_thumbnail) : getMediaUrl(profile.shop_thumbnail)}
                                                    alt="Thumbnail Preview"
                                                    className="w-full h-full object-cover opacity-100"
                                                />
                                            )}
                                        </div>

                                        {/* Fake Profile img */}
                                        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
                                            <div className="w-20 h-20 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md">
                                                {profile.picture ? (
                                                    <img src={profile.picture instanceof File ? URL.createObjectURL(profile.picture) : profile.picture} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-white shadow-inner">Foto Profil</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`mt-12 px-6 text-center relative z-10 ${profile.shop_theme_color === 'dark' ? 'text-white' : ''}`}>
                                            <p className="font-bold text-lg">@{profile.username || 'username'}</p>
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">{profile.shop_description || 'Deskripsi toko digital Anda akan ditampilkan di sini.'}</p>
                                        </div>

                                        {/* Fake Content Area based on Layout */}
                                        <div className={`mt-6 p-4 flex-1 relative z-10 border-t border-gray-100 ${profile.shop_theme_color === 'dark' ? 'bg-gray-900/80' : 'bg-gray-50/50'}`}>
                                            {profile.shop_layout === 'biolink' ? (
                                                <div className="flex flex-col gap-3">
                                                    <div className="w-full h-12 bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex items-center justify-center text-sm font-bold text-gray-700">Contoh Produk Digital 1</div>
                                                    <div className="w-full h-12 bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex items-center justify-center text-sm font-bold text-gray-700">Contoh Produk Digital 2</div>
                                                    <div className="w-full h-12 bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex items-center justify-center text-sm font-bold text-gray-700">Mini E-Course Belajar</div>
                                                </div>
                                            ) : profile.shop_layout === 'grid' ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="aspect-square bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex flex-col items-center justify-center p-3">
                                                        <div className="w-full h-full bg-gray-100 rounded-xl mb-2"></div>
                                                        <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                                    </div>
                                                    <div className="aspect-square bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex flex-col items-center justify-center p-3">
                                                        <div className="w-full h-full bg-gray-100 rounded-xl mb-2"></div>
                                                        <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                                    </div>
                                                    <div className="aspect-square bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex flex-col items-center justify-center p-3">
                                                        <div className="w-full h-full bg-gray-100 rounded-xl mb-2"></div>
                                                        <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                                    </div>
                                                    <div className="aspect-square bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex flex-col items-center justify-center p-3">
                                                        <div className="w-full h-full bg-gray-100 rounded-xl mb-2"></div>
                                                        <div className="w-3/4 h-2 bg-gray-200 rounded"></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex items-center p-3 gap-3">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                                                            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                                                            <div className="h-3 bg-green-100 rounded w-1/3 mt-2"></div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl border shadow-sm flex items-center p-3 gap-3">
                                                        <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
                                                        <div className="flex-1">
                                                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                                                            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                                                            <div className="h-3 bg-green-100 rounded w-1/3 mt-2"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            <NavigationButton />
            {cropper.active && (
                <ImageCropperModal
                    image={cropper.image}
                    aspect={16 / 9}
                    maxWidth={1280}
                    maxHeight={720}
                    onCropComplete={(croppedBlob) => {
                        const file = new File([croppedBlob], 'shop_thumbnail.jpg', { type: 'image/jpeg' });
                        setProfile(prev => ({ ...prev, shop_thumbnail: file }));
                        setCropper({ active: false, image: null });
                    }}
                    onCancel={() => setCropper({ active: false, image: null })}
                    title="Potong Thumbnail Toko"
                />
            )}
        </div>
    );
};

export default DashboardShopSettingsPage;
