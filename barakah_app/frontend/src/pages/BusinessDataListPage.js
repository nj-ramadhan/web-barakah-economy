import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import businessProfileService from '../services/businessProfile';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const BusinessDataListPage = () => {
    const navigate = useNavigate();
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const res = await businessProfileService.getBusinessProfiles();
            setBusinesses(res.data);
        } catch (err) {
            console.error('Failed to fetch businesses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus data usaha ini?')) {
            try {
                await businessProfileService.deleteBusinessProfile(id);
                fetchBusinesses();
            } catch (err) {
                console.error('Failed to delete business:', err);
                alert('Gagal menghapus data usaha');
            }
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Pendataan Partner Bisnis</h1>
                        <p className="text-sm text-gray-500">Kelola profil usaha Anda di komunitas BAE</p>
                    </div>
                    <Link 
                        to="/dashboard/business-data/new"
                        className="bg-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition"
                    >
                        <span className="material-icons">add</span>
                        Tambah Usaha
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    </div>
                ) : businesses.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-icons text-4xl text-green-600">storefront</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada data usaha</h3>
                        <p className="text-gray-500 mb-8 max-w-xs mx-auto">Daftarkan usaha Anda sekarang untuk dipublikasikan sebagai partner resmi BAE.</p>
                        <Link 
                            to="/dashboard/business-data/new"
                            className="inline-flex bg-green-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-green-100"
                        >
                            Mulai Sekarang
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {businesses.map(biz => (
                            <div key={biz.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
                                <div className="h-48 relative overflow-hidden bg-gray-100">
                                    <img 
                                        src={biz.foto_produk_1 || biz.logo} 
                                        alt={biz.brand_name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-green-700 shadow-sm">
                                            {biz.business_field_display}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button 
                                            onClick={() => navigate(`/dashboard/business-data/edit/${biz.id}`)}
                                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-blue-600 flex items-center justify-center shadow-sm hover:bg-blue-600 hover:text-white transition"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(biz.id)}
                                            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-red-600 flex items-center justify-center shadow-sm hover:bg-red-600 hover:text-white transition"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-50 shadow-sm">
                                            <img src={biz.logo} alt="Logo" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-tight">{biz.brand_name}</h3>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{biz.business_status_display}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-6 flex-1 italic">"{biz.tagline || 'No tagline'}"</p>
                                    
                                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${biz.is_website_display_approved ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {biz.is_website_display_approved ? 'Ditampilkan di Web' : 'Draf / Proses Kurasi'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-bold">
                                            {biz.sales_area_display}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default BusinessDataListPage;
