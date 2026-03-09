import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import NavigationButton from '../components/layout/Navigation';
import { getAdminWithdrawals, processAdminWithdrawal } from '../services/digitalProductApi';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0);
};

const DashboardAdminWithdrawalsPage = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [statusChange, setStatusChange] = useState('');
    const [proofFile, setProofFile] = useState(null);

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const res = await getAdminWithdrawals();
            setWithdrawals(res.data);
        } catch (err) {
            console.error('Failed to fetch withdrawals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (e) => {
        e.preventDefault();
        if (!selectedWithdrawal) return;

        setProcessing(true);
        try {
            const formData = new FormData();
            formData.append('status', statusChange);
            if (proofFile) {
                formData.append('transfer_proof', proofFile);
            }

            await processAdminWithdrawal(selectedWithdrawal.id, formData);
            alert('Penarikan berhasil diproses');
            setSelectedWithdrawal(null);
            setProofFile(null);
            fetchWithdrawals();
        } catch (err) {
            console.error('Failed to process withdrawal:', err);
            alert('Gagal memproses penarikan');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="body">
                <Header />
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                </div>
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>Manajemen Penarikan - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-6">
                    <BackButton />
                    <div>
                        <h1 className="text-xl font-bold">Manajemen Penarikan</h1>
                        <p className="text-xs text-gray-500">Proses pengajuan dana dari pengguna</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {withdrawals.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <span className="material-icons text-gray-200 text-6xl mb-4">payments</span>
                            <p className="text-gray-400">Belum ada pengajuan penarikan</p>
                        </div>
                    ) : (
                        withdrawals.map((w) => (
                            <div key={w.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${w.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : w.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        <span className="material-icons">person</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">@{w.user_username}</h3>
                                        <p className="text-xs text-gray-500">{new Date(w.created_at).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Nominal</p>
                                        <p className="text-sm font-bold text-gray-800">{formatIDR(w.amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Bank</p>
                                        <p className="text-sm font-medium">{w.bank_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Rekening</p>
                                        <p className="text-sm font-medium">{w.account_number}</p>
                                        <p className="text-[10px] text-gray-500">{w.account_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Status</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${w.status === 'approved' ? 'bg-green-100 text-green-700' : w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {w.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {w.status === 'pending' ? (
                                        <button
                                            onClick={() => {
                                                setSelectedWithdrawal(w);
                                                setStatusChange('approved');
                                            }}
                                            className="px-4 py-2 bg-green-700 text-white rounded-xl text-xs font-bold hover:bg-green-800 transition"
                                        >
                                            Proses
                                        </button>
                                    ) : (
                                        w.transfer_proof && (
                                            <a
                                                href={w.transfer_proof}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center gap-1"
                                            >
                                                <span className="material-icons text-sm">image</span>
                                                Bukti
                                            </a>
                                        )
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Admin Process Modal */}
            {selectedWithdrawal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Proses Penarikan</h3>
                            <button onClick={() => setSelectedWithdrawal(null)} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">User:</span>
                                <span className="font-bold">@{selectedWithdrawal.user_username}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Nominal Transfer:</span>
                                <span className="font-bold text-green-700">{formatIDR(selectedWithdrawal.amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tujuan:</span>
                                <span className="font-bold">{selectedWithdrawal.bank_name} - {selectedWithdrawal.account_number}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Atas Nama:</span>
                                <span className="font-bold">{selectedWithdrawal.account_name}</span>
                            </div>
                        </div>

                        <form onSubmit={handleProcess} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2">Ubah Status</label>
                                <select
                                    value={statusChange}
                                    onChange={(e) => setStatusChange(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="approved">Setujui (Approved)</option>
                                    <option value="rejected">Tolak (Rejected)</option>
                                </select>
                            </div>

                            {statusChange === 'approved' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">Upload Bukti Transfer</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setProofFile(e.target.files[0])}
                                            className="hidden"
                                            id="transfer-proof-upload"
                                        />
                                        <label
                                            htmlFor="transfer-proof-upload"
                                            className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition"
                                        >
                                            {proofFile ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-icons text-green-600">check_circle</span>
                                                    <span className="text-sm font-medium">{proofFile.name}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="material-icons text-gray-400 text-3xl mb-2">cloud_upload</span>
                                                    <span className="text-xs text-gray-500">Klik untuk upload bukti transfer (Gambar)</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedWithdrawal(null)}
                                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || (statusChange === 'approved' && !proofFile)}
                                    className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-200 disabled:opacity-50"
                                >
                                    {processing ? 'Memproses...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardAdminWithdrawalsPage;
