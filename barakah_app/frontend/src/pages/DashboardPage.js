import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
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
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [donationAmount, setDonationAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [manualBankName, setManualBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    // Testimonial state
    const [myTestimonial, setMyTestimonial] = useState(null);
    const [showTestimonialModal, setShowTestimonialModal] = useState(false);
    const [testimonialForm, setTestimonialForm] = useState({ content: '', rating: 5 });
    const [savingTestimonial, setSavingTestimonial] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) {
            navigate('/login');
            return;
        }

        if (user.username) setUsername(user.username);

        const fetchStats = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const [productRes, courseRes, balanceRes, historyRes, profileRes, testimonialRes] = await Promise.all([
                    getMyDigitalProducts(),
                    getMyCourses(),
                    getDigitalBalance().catch(() => ({ data: { available_balance: 0, total_sales: 0 } })),
                    getWithdrawalHistory().catch(() => ({ data: [] })),
                    authService.getProfile(user.id).catch(() => ({ username: '' })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/my_testimonial/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    }).catch(() => ({ data: {} }))
                ]);
                setProductCount(productRes.data.length);
                setCourseCount(courseRes.data.length);
                setBalanceData(balanceRes.data);
                setWithdrawalHistory(historyRes.data);
                if (profileRes.username) setUsername(profileRes.username);
                if (testimonialRes.data.id) {
                    setMyTestimonial(testimonialRes.data);
                    setTestimonialForm({ content: testimonialRes.data.content, rating: testimonialRes.data.rating });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [navigate]);

    const handleTestimonialSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        setSavingTestimonial(true);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/my_testimonial/`, testimonialForm, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setMyTestimonial(res.data);
            alert('Testimoni berhasil disimpan dan akan segera dimoderasi!');
            setShowTestimonialModal(false);
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan testimoni');
        } finally {
            setSavingTestimonial(false);
        }
    };

    const handleTarikSemua = () => {
        setWithdrawAmount(balanceData.available_balance.toString());
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        const donation = parseFloat(donationAmount || 0);

        // Dynamic admin fee calculation
        const finalBankName = (bankName === 'Lainnya' ? manualBankName : bankName).toUpperCase();
        let adminFee = 0;
        if (finalBankName !== 'BSI' && finalBankName !== 'GOPAY') {
            adminFee = 6500;
        }

        const totalDeduction = amount + donation + adminFee;

        if (totalDeduction > balanceData.available_balance) {
            alert('Saldo tidak mencukupi (termasuk biaya admin jika ada)');
            return;
        }

        setWithdrawing(true);
        try {
            await createWithdrawalRequest({
                amount,
                donation_amount: donation,
                bank_name: bankName === 'Lainnya' ? manualBankName : bankName,
                account_name: accountName,
                account_number: accountNumber
            });

            alert('Permintaan penarikan berhasil dikirim!');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setDonationAmount('');
            setBankName('');
            setManualBankName('');
            setAccountName('');
            setAccountNumber('');

            // Refresh data
            const [balanceRes, historyRes] = await Promise.all([
                getDigitalBalance(),
                getWithdrawalHistory()
            ]);
            setBalanceData(balanceRes.data);
            setWithdrawalHistory(historyRes.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Gagal mengirim permintaan penarikan');
        } finally {
            setWithdrawing(false);
        }
    };

    // Calculate dynamic fee for UI
    const getAdminFeeForUI = () => {
        const finalBankName = (bankName === 'Lainnya' ? manualBankName : bankName).toUpperCase();
        if (!finalBankName) return 0;
        if (finalBankName === 'BSI' || finalBankName === 'GOPAY') return 0;
        return 6500;
    };

    const adminFeeVal = getAdminFeeForUI();
    const totalDeductionVal = (parseFloat(withdrawAmount) || 0) + (parseFloat(donationAmount) || 0) + adminFeeVal;

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
                <title>Dashboard - Barakah Economy</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-20">
                <h1 className="text-xl font-bold mb-6">Dashboard</h1>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-2xl p-5 mb-6 text-white shadow-lg relative overflow-hidden">
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition"
                        title="Riwayat Penarikan"
                    >
                        <span className="material-icons text-sm">history</span>
                    </button>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        to="/dashboard/digital-products"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-green-700">inventory_2</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Produk Digital Saya</h3>
                            <p className="text-[11px] text-gray-500">Kelola dan jual produk digital Anda</p>
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
                        to={`/digital-produk/${username}`}
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

                    <div
                        onClick={() => setShowTestimonialModal(true)}
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-50 hover:shadow-md transition cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-orange-700">rate_review</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Testimoni Saya</h3>
                            <p className="text-[11px] text-gray-500">
                                {myTestimonial
                                    ? (myTestimonial.is_approved ? 'Testimoni Anda sudah tayang' : 'Menunggu moderasi admin')
                                    : 'Berikan ulasan Anda tentang Barakah App'}
                            </p>
                        </div>
                        <span className="material-icons text-gray-400">{myTestimonial ? 'edit' : 'add'}</span>
                    </div>

                    {username === 'admin' && (
                        <>
                            <Link
                                to="/dashboard/admin/withdrawals"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-orange-700">payments</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen Penarikan</h3>
                                    <p className="text-[11px] text-gray-500">Proses pengajuan dana dari user (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>
                            <Link
                                to="/dashboard/admin/charity"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-red-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-red-700">volunteer_activism</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen Charity</h3>
                                    <p className="text-[11px] text-gray-500">Kelola realisasi kampanye sosial (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>
                            <Link
                                to="/dashboard/admin/partners"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-blue-700">handshake</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen Partner</h3>
                                    <p className="text-[11px] text-gray-500">Kelola logo partner di landing page (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>
                            <Link
                                to="/dashboard/admin/testimonials"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-orange-700">rate_review</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen Testimoni</h3>
                                    <p className="text-[11px] text-gray-500">Moderasi dan tambah testimoni (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>
                            <Link
                                to="/dashboard/admin/activities"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-green-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-green-700">event_note</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen Kegiatan</h3>
                                    <p className="text-[11px] text-gray-500">Kelola berita dan kegiatan komunitas (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>

                            <Link
                                to="/dashboard/admin/users"
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-indigo-100 hover:shadow-md transition"
                            >
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <span className="material-icons text-indigo-700">people</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-sm">Manajemen User</h3>
                                    <p className="text-[11px] text-gray-500">Kelola data user dan lihat profile lengkap (Admin)</p>
                                </div>
                                <span className="material-icons text-gray-400">chevron_right</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Testimonial Modal */}
            {showTestimonialModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">{myTestimonial ? 'Ubah Testimoni' : 'Tulis Testimoni'}</h3>
                            <button onClick={() => setShowTestimonialModal(false)} className="material-icons text-gray-400">close</button>
                        </div>
                        <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Beri Rating (Klik Bintang)</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                                            className={`material-icons text-2xl ${star <= testimonialForm.rating ? 'text-orange-400' : 'text-gray-300'}`}
                                        >
                                            star
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Ulasan Anda</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={testimonialForm.content}
                                    onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    placeholder="Ceritakan pengalaman Anda menggunakan Barakah App..."
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={savingTestimonial}
                                className="w-full py-4 bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100 disabled:opacity-50"
                            >
                                {savingTestimonial ? 'Menyimpan...' : (myTestimonial ? 'Update Testimoni' : 'Kirim Testimoni')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
                                        Tarik Semua
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    placeholder="Contoh: 50000"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Donasi Program Sosial (Opsional)</label>
                                <input
                                    type="number"
                                    value={donationAmount}
                                    onChange={(e) => setDonationAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    placeholder="Berapapun donasi Anda sangat berarti"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank/E-Wallet</label>
                                    <select
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 mb-2"
                                        required
                                    >
                                        <option value="">Pilih Bank/E-Wallet</option>
                                        <option value="BSI">BSI (Gratis Admin)</option>
                                        <option value="GOPAY">GOPAY (Gratis Admin)</option>
                                        <option value="BCA">BCA</option>
                                        <option value="Mandiri">Mandiri</option>
                                        <option value="BNI">BNI</option>
                                        <option value="BRI">BRI</option>
                                        <option value="BTN">BTN</option>
                                        <option value="Muamalat">Bank Muamalat</option>
                                        <option value="DANA">DANA</option>
                                        <option value="OVO">OVO</option>
                                        <option value="ShopeePay">ShopeePay</option>
                                        <option value="Lainnya">Lainnya (Ketik Manual)</option>
                                    </select>

                                    {bankName === 'Lainnya' && (
                                        <input
                                            type="text"
                                            value={manualBankName}
                                            onChange={(e) => setManualBankName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 animate-slid-down"
                                            placeholder="Masukkan nama bank secara manual..."
                                            required
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nomor Rekening</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                        placeholder="Isi nomor rekening"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nama Pemilik Rekening</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    placeholder="Isi nama pemilik rekening"
                                    required
                                />
                            </div>

                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-1">
                                <div className="flex justify-between text-xs text-orange-800">
                                    <span>Biaya Admin:</span>
                                    <span>{formatIDR(adminFeeVal)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-orange-800 font-bold">
                                    <span>Total Pengurangan Saldo:</span>
                                    <span>{formatIDR(totalDeductionVal)}</span>
                                </div>
                                <p className="text-[9px] text-orange-600 mt-2">* Gratis biaya admin jika menggunakan BSI atau GOPAY</p>
                            </div>

                            <button
                                type="submit"
                                disabled={withdrawing || totalDeductionVal > balanceData.available_balance || !withdrawAmount}
                                className="w-full py-4 bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100 disabled:opacity-50 transition transform active:scale-95"
                            >
                                {withdrawing ? 'Memproses...' : 'Ajukan Penarikan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Riwayat Penarikan</h3>
                            <button onClick={() => setShowHistoryModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 pr-1 custom-scrollbar">
                            {withdrawalHistory.length === 0 ? (
                                <div className="text-center py-10">
                                    <span className="material-icons text-gray-200 text-5xl">payments</span>
                                    <p className="text-gray-400 text-sm mt-2">Belum ada riwayat penarikan</p>
                                </div>
                            ) : (
                                withdrawalHistory.map((w) => (
                                    <div key={w.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">{formatIDR(w.amount)}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="material-icons text-[12px] text-gray-400">calendar_today</span>
                                                    <p className="text-[10px] text-gray-500">{new Date(w.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {w.status}
                                                </span>
                                                {w.status === 'approved' && w.transfer_proof && (
                                                    <a
                                                        href={w.transfer_proof}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] text-green-700 font-bold flex items-center gap-1 hover:underline"
                                                    >
                                                        <span className="material-icons text-[12px]">image</span>
                                                        Lihat Bukti
                                                    </a>
                                                )}
                                                <p className="text-[9px] text-gray-400 flex items-center gap-1">
                                                    <span className="material-icons text-[10px]">account_balance</span>
                                                    {w.bank_name}
                                                </p>
                                            </div>
                                        </div>
                                        {w.status === 'rejected' && w.rejection_reason && (
                                            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                                <p className="text-[10px] text-red-700 leading-relaxed">
                                                    <span className="font-bold">Alasan Penolakan:</span> {w.rejection_reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardPage;
