import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import CurrencyInput from '../components/common/CurrencyInput';
import { getActiveZISConfig, submitZIS } from '../services/zisApi';
import { formatCurrency } from '../utils/formatters';

const ZISSubmissionPage = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [proof, setProof] = useState(null);
    const [preview, setPreview] = useState(null);

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const months = [];
    for (let i = -6; i <= 6; i++) {
        const d = new Date(currentYear, currentMonth + i, 1);
        months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
    const [selectedMonth, setSelectedMonth] = useState(`${monthNames[currentMonth]} ${currentYear}`);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await getActiveZISConfig();
                setConfig(res.data);
                // Initialize form with 0 for each category
                const initialData = {};
                res.data.categories.forEach(cat => {
                    initialData[cat] = 0;
                });
                setFormData(initialData);
            } catch (err) {
                console.error("Failed to fetch ZIS config", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleInputChange = (category, value) => {
        setFormData(prev => ({
            ...prev,
            [category]: parseFloat(value) || 0
        }));
    };

    const total = Object.values(formData).reduce((sum, val) => sum + val, 0);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file terlalu besar. Maksimal 5MB.');
                e.target.value = null;
                return;
            }
            setProof(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (total <= 0) {
            alert("Total nominal harus lebih dari 0");
            return;
        }
        if (!proof) {
            alert("Harap unggah bukti transfer");
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('config', config.id);
            data.append('month', selectedMonth);
            data.append('values', JSON.stringify(formData));
            data.append('total_amount', total);
            data.append('transfer_proof', proof);

            await submitZIS(data);
            alert("Laporan ZIS berhasil dikirim! Menunggu verifikasi admin.");
            navigate('/dashboard/zis/history');
        } catch (err) {
            console.error(err);
            alert("Gagal mengirim laporan ZIS");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div></div>;

    if (!config) return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <span className="material-icons text-6xl text-gray-300 mb-4">settings_suggest</span>
                <h2 className="text-xl font-bold text-gray-800">Belum Ada Konfigurasi</h2>
                <p className="text-gray-500 text-sm">Admin belum mengatur kategori ZIS Rutin.</p>
            </div>
            <NavigationButton />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-24">
            <Header />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">ZIS Rutin</h1>
                        <p className="text-sm text-gray-500 font-medium">Lengkapi data setoran ZIS bulanan Anda</p>
                    </div>
                    <button 
                        onClick={() => navigate('/dashboard/zis/history')}
                        className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm border border-gray-100 hover:bg-gray-50 transition"
                    >
                        <span className="material-icons text-sm text-green-600">history</span>
                        Riwayat
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="pb-6 border-b border-gray-100">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Periode Bulan Setoran</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-green-500"
                                required
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {config.categories.map((cat, idx) => (
                                <div key={idx}>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{cat}</label>
                                    <CurrencyInput
                                        value={formData[cat]}
                                        onChange={(e) => handleInputChange(cat, e.target.value)}
                                        placeholder={`Masukkan nominal ${cat}`}
                                        className="!bg-gray-50 !border-none !rounded-2xl !py-4"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-bold text-gray-500">Total Transfer</span>
                                <span className="text-2xl font-black text-green-700">Rp {formatCurrency(total)}</span>
                            </div>

                            {config.account_number && (
                                <div className="bg-green-50 p-6 rounded-3xl border border-green-100 mb-6">
                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-3 tracking-widest">Tujuan Transfer:</p>
                                    <p className="text-lg font-black text-gray-800 mb-1">{config.bank_name}</p>
                                    <p className="text-xl font-mono font-bold text-green-700 mb-1 tracking-wider">{config.account_number}</p>
                                    <p className="text-sm font-bold text-gray-600">a.n {config.account_name}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Bukti Transfer</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="proof-upload"
                                        required
                                    />
                                    <label
                                        htmlFor="proof-upload"
                                        className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl p-8 hover:border-green-400 transition bg-gray-50/50 group-hover:bg-white"
                                    >
                                        {preview ? (
                                            <img src={preview} alt="Preview" className="max-h-48 rounded-xl shadow-lg" />
                                        ) : (
                                            <>
                                                <span className="material-icons text-4xl text-gray-300 mb-2">add_a_photo</span>
                                                <span className="text-sm font-bold text-gray-400">Klik untuk upload foto</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || total <= 0}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-green-100 transition-all transform active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? 'Mengirim...' : 'Kirim Laporan ZIS'}
                    </button>
                </form>
            </main>
            <NavigationButton />
        </div>
    );
};

export default ZISSubmissionPage;
