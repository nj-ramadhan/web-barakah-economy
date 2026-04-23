import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAllZISSubmissions, verifyZIS, rejectZIS } from '../../services/zisApi';
import { formatCurrency } from '../../utils/formatters';

const AdminZISVerifyPage = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const res = await getAllZISSubmissions();
            setSubmissions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id) => {
        if (!window.confirm("Verifikasi setoran ini?")) return;
        try {
            await verifyZIS(id);
            alert("Berhasil diverifikasi!");
            fetchSubmissions();
        } catch (err) {
            console.error(err);
            alert("Gagal verifikasi");
        }
    };

    const handleExportCSV = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/zis/submissions/export_csv/`, {
                headers: { 'Authorization': `Bearer ${user?.access}` }
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rekap_zis.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Gagal mendownload CSV");
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt("Alasan penolakan:");
        if (reason === null) return;
        try {
            await rejectZIS(id, reason);
            alert("Berhasil ditolak");
            fetchSubmissions();
        } catch (err) {
            console.error(err);
            alert("Gagal menolak");
        }
    };

    const filtered = submissions.filter(s => filter === 'all' || s.status === filter);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-24">
            <Header />
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Verifikasi ZIS</h1>
                        <p className="text-sm text-gray-500 font-medium">Validasi setoran rutin dari para anggota</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExportCSV}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-100 transition"
                        >
                            <span className="material-icons text-sm">download</span>
                            Export CSV
                        </button>
                        <select 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-white border-none rounded-xl px-4 py-2 text-xs font-bold shadow-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">Semua</option>
                        </select>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-12 text-center border border-gray-100 shadow-sm">
                        <span className="material-icons text-6xl text-gray-200 mb-4">checklist</span>
                        <p className="text-gray-400 font-bold">Tidak ada data untuk filter ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filtered.map((item) => (
                            <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="material-icons text-gray-400">person</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 text-sm">{item.full_name || item.username}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{item.username}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        item.status === 'verified' ? 'bg-green-100 text-green-700' :
                                        item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex-1">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Periode</span>
                                            <span className="text-xs font-bold text-green-700">{item.month}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Setoran</span>
                                            <span className="text-lg font-black text-green-700">Rp {formatCurrency(item.total_amount)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {Object.entries(item.values || {}).map(([name, val], idx) => val > 0 && (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span className="text-gray-500">{name}</span>
                                                <span className="font-bold text-gray-700">Rp {formatCurrency(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => window.open(item.transfer_proof, '_blank')}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                                    >
                                        <span className="material-icons text-sm">image</span> Bukti
                                    </button>
                                    {item.status === 'pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleReject(item.id)}
                                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-xs font-bold transition"
                                            >
                                                Tolak
                                            </button>
                                            <button 
                                                onClick={() => handleVerify(item.id)}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-bold transition"
                                            >
                                                Verifikasi
                                            </button>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-4 text-center">Dikirim pada {new Date(item.created_at).toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <NavigationButton />
        </div>
    );
};

export default AdminZISVerifyPage;
