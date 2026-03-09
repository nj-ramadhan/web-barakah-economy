import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyDigitalProducts, getDigitalBalance, getWithdrawalHistory, createWithdrawalRequest } from '../services/digitalProductApi';
import { getMyCourses } from '../services/ecourseApi';
import authService from '../services/auth';

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0);
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const [productCount, setProductCount] = useState(0);
    const [courseCount, setCourseCount] = useState(0);
    const [balanceData, setBalanceData] = useState({ available_balance: 0, total_sales: 0 });
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);

    // Withdrawal state
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [donationAmount, setDonationAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) {
            navigate('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                const [productRes, courseRes, balanceRes, historyRes, profileRes] = await Promise.all([
                    getMyDigitalProducts(),
                    getMyCourses(),
                    getDigitalBalance().catch(() => ({ data: { available_balance: 0, total_sales: 0 } })),
                    getWithdrawalHistory().catch(() => ({ data: [] })),
                    authService.getProfile(user.id).catch(() => ({ username: '' }))
                ]);
                setProductCount(productRes.data.length);
                setCourseCount(courseRes.data.length);
                setBalanceData(balanceRes.data);
                setWithdrawalHistory(historyRes.data);
                if (profileRes.username) setUsername(profileRes.username);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [navigate]);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!withdrawAmount || !bankName || !accountName || !accountNumber) {
            alert('Mohon lengkapi data penarikan');
            return;
        }
        setWithdrawing(true);
        try {
            await createWithdrawalRequest({
                amount: withdrawAmount,
                donation_amount: donationAmount || 0,
                bank_name: bankName,
                account_name: accountName,
                account_number: accountNumber
            });
            alert('Permintaan penarikan berhasil diajukan');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setDonationAmount('');
            setBankName('');
            setAccountNumber('');
            setAccountName('');
            // Refetch balance and history
            const [balanceRes, historyRes] = await Promise.all([
                getDigitalBalance().catch(() => ({ data: { available_balance: 0, total_sales: 0 } })),
                getWithdrawalHistory().catch(() => ({ data: [] }))
            ]);
            setBalanceData(balanceRes.data);
            setWithdrawalHistory(historyRes.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Gagal mengajukan penarikan');
        } finally {
            setWithdrawing(false);
        }
    };

    const adminFee = (bankName && !['BSI', 'GOPAY'].includes(bankName.toUpperCase())) ? 6500 : 0;
    const totalDeduction = (parseFloat(withdrawAmount) || 0) + (parseFloat(donationAmount) || 0) + adminFee;

    const handleTarikSemua = () => {
        const available = balanceData.available_balance || 0;
        const currentDonation = parseFloat(donationAmount) || 0;
        let calculatedAmount = available - currentDonation;

        if (bankName && !['BSI', 'GOPAY'].includes(bankName.toUpperCase())) {
            calculatedAmount -= 6500;
        }
        if (calculatedAmount < 0) calculatedAmount = 0;
        setWithdrawAmount(calculatedAmount.toString());
    };

    return (
        <div className="body">
            <Helmet>
                <title>Dashboard - Barakah Economy</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-20">
                <h1 className="text-xl font-bold mb-6">Dashboard</h1>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-2xl p-5 mb-6 text-white shadow-lg">
                    <p className="text-xs opacity-80 mb-1">Saldo Tersedia</p>
                    <h2 className="text-2xl font-bold mb-4">{formatIDR(balanceData.available_balance)}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            className="bg-white text-green-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                        >
                            Tarik Saldo
                        </button>
                        <div className="text-[10px] opacity-70 flex flex-col justify-center">
                            <span>Total Penjualan: {formatIDR(balanceData.total_sales)}</span>
                            <div className="flex gap-2">
                                <span>Digital: {formatIDR(balanceData.digital_sales_total || 0)}</span>
                                <span>Course: {formatIDR(balanceData.course_sales_total || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <Link to="/dashboard/digital-products" className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">inventory_2</span>
                        <p className="font-bold text-2xl">{loading ? '...' : productCount}</p>
                        <p className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">Produk Digital</p>
                    </Link>
                    <Link to="/dashboard/ecourses" className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">school</span>
                        <p className="font-bold text-2xl">{loading ? '...' : courseCount}</p>
                        <p className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">E-Course Saya</p>
                    </Link>
                </div>

                {/* Menu */}
                <h2 className="font-semibold text-gray-700 mb-3 px-1">Manajemen Bisnis</h2>
                <div className="space-y-3">
                    <Link
                        to="/dashboard/digital-products"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-green-700">storefront</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Produk Digital Saya</h3>
                            <p className="text-[11px] text-gray-500">Kelola produk digital yang Anda jual</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>

                    <Link
                        to="/dashboard/ecourses"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-blue-700">video_library</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">E-Course Saya</h3>
                            <p className="text-[11px] text-gray-500">Buat dan kelola video pembelajaran</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>

                    <Link
                        to={`/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-purple-700">visibility</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Lihat Toko</h3>
                            <p className="text-[11px] text-gray-500">Pratinjau toko digital Anda</p>
                        </div>
                        <span className="material-icons text-gray-400">open_in_new</span>
                    </Link>

                    <Link
                        to="/dashboard/shop-settings"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-orange-700">storefront</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Pengaturan Toko</h3>
                            <p className="text-[11px] text-gray-500">Dandani tampilan dan tautan toko Anda</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>
                </div>

                {/* Withdrawal History */}
                {withdrawalHistory.length > 0 && (
                    <div className="mt-8">
                        <h2 className="font-bold mb-3 text-gray-700 px-1">Riwayat Penarikan</h2>
                        <div className="space-y-2">
                            {withdrawalHistory.map((w) => (
                                <div key={w.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold">{formatIDR(w.amount)}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {w.status.toUpperCase()}
                                        </span>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{w.bank_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Tarik Saldo</h3>
                            <button onClick={() => setShowWithdrawModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-medium text-gray-500">Nominal Tarik (Rp)</label>
                                    <button
                                        type="button"
                                        onClick={handleTarikSemua}
                                        className="text-[10px] text-green-700 font-bold hover:underline"
                                    >
                                        Tarik Semua Saldo
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Min. 10.000"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Saldo tersedia: {formatIDR(balanceData.available_balance || 0)}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Berbagi / Sadaqoh ke BAE (Opsional)</label>
                                <input
                                    type="number"
                                    value={donationAmount}
                                    onChange={(e) => setDonationAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Masukkan nominal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank</label>
                                    <input
                                        type="text"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                        placeholder="BSI / BCA / DLL"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">No. Rekening</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Atas Nama Rekening</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Nama Sesuai Buku Tabungan"
                                    required
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Biaya Admin</span>
                                    <span className={adminFee > 0 ? 'text-red-500' : 'text-green-600'}>
                                        {adminFee > 0 ? formatIDR(adminFee) : 'Gratis'}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-200">
                                    <span>Total Potongan Saldo</span>
                                    <span className="text-red-600">{formatIDR(totalDeduction)}</span>
                                </div>
                                {adminFee > 0 && <p className="text-[10px] text-gray-400 italic">* Biaya admin Rp 6.500 berlaku untuk bank selain BSI / GOPAY</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={withdrawing}
                                className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                            >
                                {withdrawing ? 'Memproses...' : 'Ajukan Penarikan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardPage;
