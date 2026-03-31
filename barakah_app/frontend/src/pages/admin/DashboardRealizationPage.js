import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0);
};

const ASNAF_OPTIONS = [
    'Fakir', 'Miskin', 'Amil', 'Mualaf', 'Riqab', 'Gharimin', 'Fisabilillah', 'Ibnu Sabil', 'Yatim', 'Operational', 'Bencana Alam', 'Kemanusiaan', 'Kesehatan', 'Pendidikan', 'Lingkungan', 'Pembangunan', 'Sosial', 'Masjid', 'Waqaf', 'Lainnya'
];

const DashboardRealizationPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [realizations, setRealizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRealization, setSelectedRealization] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        beneficiaries: '',
        beneficiary_status: 'Lainnya',
        nominal: ''
    });

    const location = useLocation();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.username !== 'admin') {
            navigate('/dashboard');
            return;
        }

        const fetchCampaigns = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`);
                const campaignData = response.data.results || response.data;
                setCampaigns(campaignData);
                
                // Check for campaign slug in URL
                const queryParams = new URLSearchParams(location.search);
                const campaignSlug = queryParams.get('campaign');
                if (campaignSlug) {
                    const campaign = campaignData.find(c => c.slug === campaignSlug);
                    if (campaign) {
                        handleSelectCampaign(campaign);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaigns();
    }, [navigate, location.search]);

    const fetchRealizations = async (slug) => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/realizations/`, {
                params: { campaign_slug: slug },
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setRealizations(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectCampaign = (campaign) => {
        setSelectedCampaign(campaign);
        fetchRealizations(campaign.slug);
    };

    const handleAddRealization = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/realizations/`, {
                campaign: selectedCampaign.id,
                ...formData
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Realisasi berhasil ditambahkan!');
            setShowAddModal(false);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                beneficiaries: '',
                beneficiary_status: 'Lainnya',
                nominal: ''
            });
            fetchRealizations(selectedCampaign.slug);
        } catch (err) {
            console.error(err);
            alert('Gagal menambahkan realisasi');
        }
    };

    const handleDeleteRealization = async (id) => {
        if (!window.confirm('Hapus realisasi ini?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/realizations/${id}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            fetchRealizations(selectedCampaign.slug);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus realisasi');
        }
    };


    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Laporan Realisasi: ${selectedCampaign.title}`, 14, 15);

        const tableBody = realizations.map(r => [
            r.date,
            r.description,
            r.beneficiaries,
            r.beneficiary_status,
            formatIDR(r.nominal)
        ]);

        doc.autoTable({
            startY: 20,
            head: [['Tanggal', 'Keterangan', 'Penerima', 'Status', 'Nominal']],
            body: tableBody,
        });

        doc.save(`Realisasi_${selectedCampaign.slug}.pdf`);
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="body">
            <Helmet>
                <title>Manajemen Realisasi Charity - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="material-icons text-gray-500">arrow_back</button>
                    <h1 className="text-xl font-bold">Manajemen Realisasi Charity</h1>
                </div>

                {!selectedCampaign ? (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-gray-500 mb-2">Pilih Kampanye:</h2>
                        {campaigns.map(c => (
                            <div
                                key={c.id}
                                onClick={() => handleSelectCampaign(c)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                            >
                                <div>
                                    <h3 className="font-bold text-gray-800">{c.title}</h3>
                                    <p className="text-xs text-gray-500">Terkumpul: {formatIDR(c.current_amount)}</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="bg-green-700 text-white p-6 rounded-2xl mb-6 shadow-lg">
                            <h2 className="font-bold text-lg mb-1">{selectedCampaign.title}</h2>
                            <p className="text-xs opacity-80 mb-4 text-white">Kelola data penggunaan dana donasi</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-white text-green-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                                >
                                    <span className="material-icons text-sm">add</span>
                                    Tambah
                                </button>
                                <button
                                    onClick={exportToPDF}
                                    className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-500"
                                >
                                    <span className="material-icons text-sm">picture_as_pdf</span>
                                    PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Daftar Realisasi</h3>
                            <button onClick={() => setSelectedCampaign(null)} className="text-xs text-green-700 font-bold">Ganti Kampanye</button>
                        </div>

                        <div className="space-y-4">
                            {realizations.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 text-sm">Belum ada data realisasi</p>
                                </div>
                            ) : (
                                realizations.map(r => (
                                    <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2">
                                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                                                    {new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                    {r.beneficiary_status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-gray-900">{formatIDR(r.nominal)}</span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRealization(r);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="material-icons text-blue-500 text-sm"
                                                    title="Detail"
                                                >
                                                    visibility
                                                </button>
                                                <button onClick={() => handleDeleteRealization(r.id)} className="material-icons text-red-500 text-sm">delete</button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{r.description}</p>
                                        <p className="text-xs text-gray-500 italic">Penerima: {r.beneficiaries}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedRealization && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Detail Realisasi</h3>
                            <button onClick={() => setShowDetailModal(false)} className="material-icons text-gray-400">close</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Tanggal</label>
                                <p className="text-sm font-medium">{new Date(selectedRealization.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Nominal</label>
                                    <p className="text-sm font-bold text-green-700">{formatIDR(selectedRealization.nominal)}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Status (Asnaf)</label>
                                    <p className="text-sm font-medium">{selectedRealization.beneficiary_status}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Keterangan</label>
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                                    {selectedRealization.description}
                                </p>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Penerima Manfaat</label>
                                <p className="text-sm text-gray-600 italic bg-orange-50/30 p-3 rounded-xl border border-orange-100/50">
                                    {selectedRealization.beneficiaries}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="w-full mt-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Tambah Realisasi</h3>
                            <button onClick={() => setShowAddModal(false)} className="material-icons text-gray-400">close</button>
                        </div>
                        <form onSubmit={handleAddRealization} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nominal (Rp)</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.nominal}
                                        onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                                        placeholder="1000000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Status Penerima (Asnaf)</label>
                                <select
                                    required
                                    value={formData.beneficiary_status}
                                    onChange={(e) => setFormData({ ...formData, beneficiary_status: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                                >
                                    {ASNAF_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Keterangan</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                                    placeholder="Deskripsi penyaluran dana..."
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Penerima Manfaat</label>
                                <textarea
                                    required
                                    rows="2"
                                    value={formData.beneficiaries}
                                    onChange={(e) => setFormData({ ...formData, beneficiaries: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                                    placeholder="Contoh: 50 anak yatim Piatu Bina Amal"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100"
                            >
                                Simpan Realisasi
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardRealizationPage;
