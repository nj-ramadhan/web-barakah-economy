import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import businessProfileService from '../../services/businessProfile';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const DashboardAdminBusinessPage = () => {
    const navigate = useNavigate();
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleToggleDisplay = async (id, currentStatus) => {
        try {
            await businessProfileService.updateBusinessProfile(id, { is_website_display_approved: !currentStatus });
            fetchBusinesses();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleToggleCurated = async (id, currentStatus) => {
        try {
            await businessProfileService.updateBusinessProfile(id, { is_curated: !currentStatus });
            fetchBusinesses();
        } catch (err) {
            console.error('Failed to update curated status:', err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Hapus permanen data usaha ini?')) {
            try {
                await businessProfileService.deleteBusinessProfile(id);
                fetchBusinesses();
            } catch (err) {
                console.error('Failed to delete:', err);
            }
        }
    };

    const filtered = businesses.filter(b => 
        b.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-gray-50 min-h-screen">
            <Header />
            <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Manajemen Partner Bisnis</h1>
                        <p className="text-sm text-gray-500 font-medium">Kurasi dan kelola data usaha seluruh anggota BAE</p>
                    </div>
                    <div className="w-full md:w-96 relative">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input 
                            type="text"
                            placeholder="Cari brand, username, atau nama..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bisnis & Pemilik</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Skala</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Web</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kurasi</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(biz => (
                                        <tr key={biz.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden bg-white shrink-0">
                                                        <img src={biz.logo} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 leading-tight">{biz.brand_name}</p>
                                                        <p className="text-[11px] text-gray-500 font-medium">Oleh: <span className="text-green-600 font-bold">@{biz.username}</span></p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
                                                    {biz.business_field_display}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-medium text-gray-600">{biz.business_scale_display}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleToggleDisplay(biz.id, biz.is_website_display_approved)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${biz.is_website_display_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                                                >
                                                    <span className="material-icons text-sm">{biz.is_website_display_approved ? 'visibility' : 'visibility_off'}</span>
                                                    {biz.is_website_display_approved ? 'Public' : 'Hidden'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => handleToggleCurated(biz.id, biz.is_curated)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${biz.is_curated ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}
                                                >
                                                    <span className="material-icons text-sm">{biz.is_curated ? 'auto_awesome' : 'hourglass_empty'}</span>
                                                    {biz.is_curated ? 'Terpilih' : 'Pending'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => navigate(`/dashboard/business-data/edit/${biz.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><span className="material-icons text-lg">edit</span></button>
                                                    <button onClick={() => handleDelete(biz.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><span className="material-icons text-lg">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-20 text-center text-gray-400 italic">Data tidak ditemukan</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardAdminBusinessPage;
