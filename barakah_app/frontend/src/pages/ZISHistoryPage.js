import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyZISHistory } from '../services/zisApi';
import { formatCurrency } from '../utils/formatters';

const ZISHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await getMyZISHistory();
                setHistory(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-24">
            <Header />
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Riwayat ZIS</h1>
                    <p className="text-sm text-gray-500 font-medium">Pantau status setoran rutin Anda</p>
                </div>

                {history.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-12 text-center border border-gray-100 shadow-sm">
                        <span className="material-icons text-6xl text-gray-200 mb-4">history</span>
                        <p className="text-gray-400 font-bold">Belum ada riwayat setoran.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item) => (
                            <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl font-black text-gray-900">Rp {formatCurrency(item.total_amount)}</span>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                            <span className="material-icons text-[14px]">calendar_today</span>
                                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => window.open(item.transfer_proof, '_blank')}
                                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition"
                                        title="Lihat Bukti Transfer"
                                    >
                                        <span className="material-icons text-gray-400">image</span>
                                    </button>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {Object.entries(item.values || {}).map(([name, val], idx) => val > 0 && (
                                        <div key={idx} className="bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] border border-gray-100">
                                            <span className="text-gray-400 font-bold mr-1">{name}:</span>
                                            <span className="font-black text-gray-700">Rp {formatCurrency(val)}</span>
                                        </div>
                                    ))}
                                </div>
                                {item.status === 'rejected' && item.rejection_reason && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                                        <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Alasan Penolakan:</p>
                                        <p className="text-xs text-red-500">{item.rejection_reason}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <NavigationButton />
        </div>
    );
};

export default ZISHistoryPage;
