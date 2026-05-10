import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import CurrencyInput from '../components/common/CurrencyInput';
import { formatCurrency } from '../utils/formatters';
import { getMyDigitalProducts, getDigitalBalance, getWithdrawalHistory, createWithdrawalRequest } from '../services/digitalProductApi';
import { getMyCourses } from '../services/ecourseApi';
import authService from '../services/auth';
import { useTranslation } from 'react-i18next';

const formatIDR = (amount) => {
    return 'Rp ' + formatCurrency(amount);
};

const DashboardPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [productCount, setProductCount] = useState(0);
    const [sinergyProductCount, setSinergyProductCount] = useState(0);
    const [courseCount, setCourseCount] = useState(0);
    const [balanceData, setBalanceData] = useState({ available_balance: 0, total_sales: 0 });
    const [username, setUsername] = useState('');
    const [userProfile, setUserProfile] = useState(null);
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

    const [sinergyPendingCount, setSinergyPendingCount] = useState(0);
    // Management Stats State
    const [managementStats, setManagementStats] = useState({});

    // Profile Completeness Enforcer State
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
    const [missingFields, setMissingFields] = useState([]);

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
                const [productRes, courseRes, balanceRes, historyRes, profileRes, testimonialRes, statsRes, sinergyStatsRes, sinergyProductsRes] = await Promise.all([
                    getMyDigitalProducts(),
                    getMyCourses(),
                    getDigitalBalance().catch(() => ({ data: { available_balance: 0, total_sales: 0 } })),
                    getWithdrawalHistory().catch(() => ({ data: [] })),
                    authService.getProfile(user.id).catch(() => ({ username: '' })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/my_testimonial/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    }).catch(() => ({ data: {} })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/management-stats/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    }).catch(() => ({ data: {} })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/stats/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    }).catch(() => ({ data: { pending_count: 0 } })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    }).catch(() => ({ data: [] }))
                ])
                
                if (sinergyProductsRes && sinergyProductsRes.data) {
                    setSinergyProductCount(sinergyProductsRes.data.length);
                }
                
                if (sinergyStatsRes && sinergyStatsRes.data) {
                    setSinergyPendingCount(sinergyStatsRes.data.pending_count || 0);
                }

                // Also check profile completeness to enforce dashboard access
                try {
                    const completenessRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/check-completeness/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    });
                    if (completenessRes.data.requires_completion) {
                        setIsProfileIncomplete(true);
                        setMissingFields(completenessRes.data.missing_fields || []);
                    }
                } catch (err) {
                    console.error("Dashboard check-completeness failed:", err);
                }

                setProductCount(productRes.data.length);
                setCourseCount(courseRes.data.length);
                setBalanceData(balanceRes.data);
                setWithdrawalHistory(historyRes.data);
                setUserProfile(profileRes);
                if (profileRes.username) setUsername(profileRes.username);
                if (testimonialRes.data.id) {
                    setMyTestimonial(testimonialRes.data);
                    setTestimonialForm({ content: testimonialRes.data.content, rating: testimonialRes.data.rating });
                }
                if (statsRes && statsRes.data) {
                    setManagementStats(statsRes.data);
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

    const DashboardSkeleton = () => (
        <div className="max-w-6xl mx-auto px-4 py-4 pb-20 animate-pulse">
            <div className="w-32 h-7 bg-gray-200 rounded mb-6"></div>

            {/* Balance Card Skeleton */}
            <div className="bg-green-100 rounded-2xl p-5 mb-6 shadow-sm relative h-40 border border-green-200">
                <div className="w-8 h-8 absolute top-4 right-4 bg-green-200 rounded-full"></div>
                <div className="w-24 h-3 bg-green-200 rounded mt-2 mb-3"></div>
                <div className="w-48 h-8 bg-green-300 rounded mb-4"></div>
                <div className="flex gap-2">
                    <div className="w-24 h-9 bg-green-200 rounded-xl"></div>
                    <div className="flex flex-col justify-center gap-1">
                        <div className="w-32 h-2 bg-green-200 rounded"></div>
                        <div className="w-40 h-2 bg-green-200 rounded"></div>
                    </div>
                </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-200 rounded-xl p-4 h-24"></div>
                <div className="bg-gray-200 rounded-xl p-4 h-24"></div>
            </div>

            <div className="w-32 h-5 bg-gray-200 rounded mb-4 mt-6"></div>

            {/* Menus Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
                        <div className="flex-1 space-y-2">
                            <div className="w-24 h-4 bg-gray-200 rounded"></div>
                            <div className="w-32 h-3 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="body bg-gray-50 min-h-screen">
                <Header />
                <DashboardSkeleton />
                <NavigationButton />
            </div>
        );
    }

    if (isProfileIncomplete) {
        return (
            <div className="body bg-gray-50 min-h-screen">
                <Header />
                <div className="flex flex-col items-center justify-center p-6 text-center mt-10 max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-gray-100">
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse"></div>
                        <div className="absolute inset-2 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="material-icons text-white text-4xl">lock_person</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight mb-3">Akses Dashboard Terkunci</h2>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Anda harus melengkapi biodata untuk mendapatkan akses penuh ke fitur Dashboard keanggotaan <span className="font-bold text-green-700">Barakah</span>.
                    </p>

                    {missingFields && missingFields.length > 0 && (
                        <div className="mb-8 p-4 bg-orange-50 rounded-xl border border-orange-100 w-full text-left">
                            <h4 className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="material-icons text-[14px]">warning</span> Data yang perlu dilengkapi:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {missingFields.map(field => (
                                    <span key={field} className="text-xs bg-white text-orange-700 px-3 py-1 rounded-full shadow-sm font-medium border border-orange-200">
                                        {field.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/profile/edit?complete=1')}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-green-200 transition-all transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-3"
                    >
                        <span>Lengkapi Biodata Sekarang</span>
                        <span className="material-icons text-lg">arrow_forward</span>
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                    >
                        Kembali ke Halaman Utama
                    </button>
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
                <h1 className="text-xl font-bold mb-6">{t('dashboard.title', 'Dashboard')}</h1>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-2xl p-5 mb-6 text-white shadow-lg relative overflow-hidden">
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition"
                        title="Riwayat Penarikan"
                    >
                        <span className="material-icons text-sm">history</span>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest mb-1">Saldo Tersedia</p>
                            <h2 className="text-3xl font-black">{formatIDR(balanceData.available_balance)}</h2>
                        </div>
                        <div className="md:text-right">
                            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest mb-1">Saldo Tertahan (Pending)</p>
                            <h2 className="text-xl font-bold text-green-300">{formatIDR(balanceData.pending_balance || 0)}</h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-white/10">
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            className="bg-white text-green-800 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-green-50 transition-all active:scale-95"
                        >
                            Tarik Saldo
                        </button>
                        
                        <div className="flex-1 min-w-[200px]">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-bold uppercase tracking-tight opacity-80">
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Digital: {formatIDR(balanceData.total_digital_sales || 0)}</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Course: {formatIDR(balanceData.total_course_sales || 0)}</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> E-com (Selesai): {formatIDR(balanceData.total_sinergy_sales || 0)}</span>
                                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> E-com (Pending): {formatIDR(balanceData.total_sinergy_pending || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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
                    {userProfile?.accessible_menus?.includes('sinergy_products') || userProfile?.username === 'admin' || userProfile?.role === 'admin' ? (
                        <Link to="/dashboard/sinergy/seller" className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl p-4 text-white relative">
                            {sinergyPendingCount > 0 && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                                    {sinergyPendingCount}
                                </div>
                            )}
                            <span className="material-icons text-2xl mb-1">shopping_bag</span>
                            <p className="font-bold text-2xl">{loading ? '...' : sinergyProductCount}</p>
                            <p className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">Produk Fisik</p>
                        </Link>
                    ) : null}
                </div>

                {/* Menu */}
                <h2 className="font-semibold text-gray-700 mb-3 px-1">Manajemen Bisnis & Personal</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                    {(() => {
                        const userRes = JSON.parse(localStorage.getItem('user'));
                        const isAdmin = userRes?.username === 'admin' || userRes?.role === 'admin';
                        const accessibleMenus = userProfile?.accessible_menus || [];
                        // Helper to check if user has custom role access OR if it's a default menu (for now let's make it strict per user request)
                        const hasAccess = (menuKey) => isAdmin || accessibleMenus.includes(menuKey) || accessibleMenus.includes('*');

                        return (
                            <>
                                {hasAccess('digital_products') && (
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
                                )}

                                {hasAccess('my_ecourses') && (
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
                                )}

                                {hasAccess('view_shop') && (
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
                                )}

                                {hasAccess('shop_settings') && (
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
                                )}

                                {hasAccess('my_testimonials') && (
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
                                )}

                                 {hasAccess('submit_campaign') && (
                                    <Link
                                        to="/dashboard/my-campaigns"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-red-50 hover:shadow-md transition"
                                    >
                                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-red-700">campaign</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">Ajukan Charity</h3>
                                            <p className="text-[11px] text-gray-500">Buat dan pantau pengajuan program charity Anda</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}

                                {hasAccess('write_article') && (
                                    <Link
                                        to="/dashboard/articles"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-50 hover:shadow-md transition"
                                    >
                                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-orange-700">edit_note</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">Tulis Article</h3>
                                            <p className="text-[11px] text-gray-500">Buat dan kelola artikel dengan editor rich text</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}

                                 {hasAccess('my_events') && (
                                    <Link
                                        to="/dashboard/my-events"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-indigo-50 hover:shadow-md transition"
                                    >
                                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-indigo-700">celebration</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">Event Barakah</h3>
                                            <p className="text-[11px] text-gray-500">Kelola pendaftaran dan pengajuan event Anda</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}



                                {hasAccess('business_data') && (
                                    <Link
                                        to="/dashboard/business-data"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 hover:shadow-md transition"
                                    >
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-emerald-700">handshake</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">Pendataan Partner Bisnis</h3>
                                            <p className="text-[11px] text-gray-500">Daftarkan usaha Anda sebagai partner resmi BAE</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}

                                {hasAccess('zis_routine') && (
                                    <Link
                                        to="/dashboard/zis"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 hover:shadow-md transition"
                                    >
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-emerald-700">payments</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">ZIS Rutin</h3>
                                            <p className="text-[11px] text-gray-500">Setoran zakat, infaq, dan sedekah bulanan</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}

                                {hasAccess('sinergy_products') && (
                                    <Link
                                        to="/dashboard/sinergy/seller"
                                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-green-100 hover:shadow-md transition relative"
                                    >
                                        {sinergyPendingCount > 0 && (
                                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 animate-bounce">
                                                {sinergyPendingCount}
                                            </div>
                                        )}
                                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-green-700">inventory</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-sm">Pembuatan Produk (E-commerce)</h3>
                                            <p className="text-[11px] text-gray-500">Kelola dan tambah produk fisik Anda</p>
                                        </div>
                                        <span className="material-icons text-gray-400">chevron_right</span>
                                    </Link>
                                )}
                            </>
                        );
                    })()}
                </div>

                {/* Admin Management Section */}
                {(() => {
                    const userRes = JSON.parse(localStorage.getItem('user'));
                    const isAdmin = userRes?.username === 'admin' || userRes?.role === 'admin';
                    const accessibleMenus = userProfile?.accessible_menus || [];
                    const hasAccess = (menuKey) => isAdmin || accessibleMenus.includes(menuKey) || accessibleMenus.includes('*');

                    const adminSections = [
                        {
                            title: 'Admin Keuangan & Bisnis',
                            items: [
                                {
                                    id: 'withdrawals',
                                    access: hasAccess('withdrawals'),
                                    to: '/dashboard/admin/withdrawals',
                                    icon: 'payments',
                                    color: 'orange',
                                    title: 'Manajemen Penarikan',
                                    desc: 'Proses pengajuan dana dari user (Admin)',
                                    badge: managementStats.withdrawals
                                },
                                {
                                    id: 'donations',
                                    access: hasAccess('charity'),
                                    to: '/dashboard/admin/donations',
                                    icon: 'payments',
                                    color: 'emerald',
                                    title: 'Donatur Charity',
                                    desc: 'Kelola dan verifikasi donasi masuk (Admin)',
                                    badge: managementStats.pending_donations
                                },
                                {
                                    id: 'charity_realization',
                                    access: hasAccess('charity'),
                                    to: '/dashboard/admin/charity',
                                    icon: 'volunteer_activism',
                                    color: 'red',
                                    title: 'Realisasi Charity',
                                    desc: 'Kelola realisasi program charity (Admin)'
                                },
                                {
                                    id: 'transactions',
                                    access: hasAccess('transactions'),
                                    to: '/dashboard/admin/transactions',
                                    icon: 'receipt_long',
                                    color: 'green',
                                    title: 'Riwayat Transaksi',
                                    desc: 'Pantau semua transaksi (Digital & Course)'
                                },
                                {
                                    id: 'zis_config',
                                    access: hasAccess('zis_management'),
                                    to: '/dashboard/admin/zis-config',
                                    icon: 'settings_applications',
                                    color: 'slate',
                                    title: 'Pengaturan ZIS',
                                    desc: 'Atur kategori pos dan rekening ZIS (Admin)'
                                },
                                {
                                    id: 'zis_verify',
                                    access: hasAccess('zis_management'),
                                    to: '/dashboard/admin/zis-verify',
                                    icon: 'fact_check',
                                    color: 'green',
                                    title: 'Verifikasi ZIS',
                                    desc: 'Validasi laporan setoran anggota (Admin)'
                                }
                            ]
                        },
                        {
                            title: 'Admin Bisnis',
                            items: [
                                {
                                    id: 'admin_sinergy',
                                    access: hasAccess('admin_sinergy'),
                                    to: '/dashboard/admin/sinergy',
                                    icon: 'storefront',
                                    color: 'emerald',
                                    title: 'Manajemen Produk',
                                    desc: 'Persetujuan dan manajemen seluruh produk fisik (Admin)',
                                    badge: managementStats.admin_sinergy
                                },
                                {
                                    id: 'testimonials',
                                    access: hasAccess('testimonials'),
                                    to: '/dashboard/admin/testimonials',
                                    icon: 'rate_review',
                                    color: 'orange',
                                    title: 'Manajemen Testimoni',
                                    desc: 'Moderasi dan tambah testimoni (Admin)',
                                    badge: managementStats.testimonials
                                },
                                {
                                    id: 'all_products',
                                    access: hasAccess('all_products'),
                                    to: '/dashboard/admin/all-products',
                                    icon: 'inventory',
                                    color: 'emerald',
                                    title: 'Semua Produk Digital',
                                    desc: 'Pantau dan kelola produk semua user (Admin)'
                                },
                                {
                                    id: 'all_courses',
                                    access: hasAccess('all_courses'),
                                    to: '/dashboard/admin/all-courses',
                                    icon: 'video_library',
                                    color: 'blue',
                                    title: 'Semua E-Course',
                                    desc: 'Pantau dan kelola course semua user (Admin)'
                                },
                                {
                                    id: 'admin_business_partners',
                                    access: hasAccess('partners'),
                                    to: '/dashboard/admin/business-partners',
                                    icon: 'handshake',
                                    color: 'green',
                                    title: 'Manajemen Partner Bisnis',
                                    desc: 'Kurasi dan kelola data usaha anggota BAE (Admin)'
                                }
                            ]
                        },
                        {
                            title: 'Admin Konten & Pengumuman',
                            items: [
                                {
                                    id: 'announcements',
                                    access: hasAccess('announcements'),
                                    to: '/dashboard/admin/announcements',
                                    icon: 'campaign',
                                    color: 'blue',
                                    title: 'Manajemen Pengumuman',
                                    desc: 'Kelola pop-up pengumuman & iklan aplikasi (Admin)'
                                },
                                {
                                    id: 'hero_banners',
                                    access: hasAccess('announcements'),
                                    to: '/dashboard/admin/hero-banners',
                                    icon: 'view_carousel',
                                    color: 'indigo',
                                    title: 'Manajemen Hero Banner',
                                    desc: 'Kelola slider gambar & video di landing page (Admin)'
                                },
                                {
                                    id: 'activities',
                                    access: hasAccess('activities'),
                                    to: '/dashboard/admin/activities',
                                    icon: 'event_note',
                                    color: 'green',
                                    title: 'Manajemen Kegiatan',
                                    desc: 'Kelola berita dan kegiatan komunitas (Admin)'
                                },
                                {
                                    id: 'activity_calendar',
                                    access: hasAccess('activities'),
                                    to: '/dashboard/admin/calendar',
                                    icon: 'calendar_month',
                                    color: 'indigo',
                                    title: 'Kalender Kegiatan',
                                    desc: 'Pantau jadwal event & charity (Admin)'
                                },
                                {
                                    id: 'articles',
                                    access: hasAccess('articles'),
                                    to: '/dashboard/admin/articles',
                                    icon: 'article',
                                    color: 'orange',
                                    title: 'Manajemen Artikel',
                                    desc: 'Kelola semua artikel yang terbit (Admin)'
                                }
                            ]
                        },
                        {
                            title: 'Admin Event',
                            items: [
                                {
                                    id: 'events',
                                    access: hasAccess('admin_events'),
                                    to: '/dashboard/admin/events',
                                    icon: 'event',
                                    color: 'teal',
                                    title: 'Manajemen Event',
                                    desc: 'Kelola pendaftaran dan detail event (Admin)',
                                    badge: managementStats.admin_events
                                },
                                {
                                    id: 'photo_framer',
                                    access: hasAccess('photo_framer'),
                                    to: '/dashboard/admin/photo-framer',
                                    icon: 'filter_frames',
                                    color: 'pink',
                                    title: 'Bingkai Otomatis',
                                    desc: 'Pasang bingkai ke banyak foto sekaligus (Batch)'
                                },
                                {
                                    id: 'event_recap',
                                    access: hasAccess('admin_events'),
                                    to: '/dashboard/admin/event-recap',
                                    icon: 'groups',
                                    color: 'emerald',
                                    title: 'Rekap Global',
                                    desc: 'Data seluruh peserta event & CRM Blast WA'
                                },
                                {
                                    id: 'meetings_list',
                                    access: hasAccess('internal_meetings'),
                                    to: '/dashboard/meetings',
                                    icon: 'groups',
                                    color: 'blue',
                                    title: 'Manajemen Rapat',
                                    desc: 'Kelola agenda rapat internal dan absensi (Admin)'
                                }
                            ]
                        },
                        {
                            title: 'Admin User',
                            items: [
                                {
                                    id: 'users',
                                    access: hasAccess('users'),
                                    to: '/dashboard/admin/users',
                                    icon: 'people',
                                    color: 'indigo',
                                    title: 'Manajemen User',
                                    desc: 'Kelola data user dan lihat profile lengkap (Admin)'
                                },
                                {
                                    id: 'roles',
                                    access: hasAccess('roles'),
                                    to: '/dashboard/admin/roles',
                                    icon: 'admin_panel_settings',
                                    color: 'violet',
                                    title: 'Manajemen Role & Label',
                                    desc: 'Kelola role, akses menu, dan label pengguna (Admin)'
                                }
                            ]
                        },
                        {
                            title: 'Admin Charity',
                            items: [
                                {
                                    id: 'admin_campaigns',
                                    access: hasAccess('charity'),
                                    to: '/dashboard/admin/campaigns',
                                    icon: 'campaign',
                                    color: 'red',
                                    title: 'Manajemen Charity',
                                    desc: 'Kelola semua program charity yang aktif (Admin)'
                                },
                                {
                                    id: 'campaign_approval',
                                    access: hasAccess('campaign_approval'),
                                    to: '/dashboard/admin/campaign-approval',
                                    icon: 'assignment_turned_in',
                                    color: 'amber',
                                    title: 'Persetujuan Charity',
                                    desc: 'Verifikasi pengajuan program charity dari user (Admin)',
                                    badge: managementStats.campaign_approval
                                }
                            ]
                        },
                        {
                            title: 'Lainnya',
                            items: [
                                {
                                    id: 'forum',
                                    access: hasAccess('forum'),
                                    to: '/dashboard/admin/forum',
                                    icon: 'forum',
                                    color: 'cyan',
                                    title: 'Manajemen Forum',
                                    desc: 'Moderasi diskusi dan balasan postingan (Admin)'
                                },
                                {
                                    id: 'live_meet',
                                    access: isAdmin,
                                    to: '/live-meet-test',
                                    icon: 'videocam',
                                    color: 'emerald',
                                    title: 'Live Meet Prototype',
                                    desc: 'Uji coba fitur video conference Jitsi (Admin)'
                                },
                                {
                                    id: 'about_us',
                                    access: hasAccess('about_us'),
                                    to: '/dashboard/admin/about-us',
                                    icon: 'info',
                                    color: 'pink',
                                    title: 'Manajemen Tentang Kami',
                                    desc: 'Kelola konten profil dan visi misi komunitas (Admin)'
                                },
                                {
                                    id: 'partners',
                                    access: hasAccess('partners'),
                                    to: '/dashboard/admin/partners',
                                    icon: 'handshake',
                                    color: 'blue',
                                    title: 'Manajemen Partner',
                                    desc: 'Kelola logo partner di landing page (Admin)'
                                },
                                {
                                    id: 'consultants',
                                    access: hasAccess('consultants'),
                                    to: '/dashboard/admin/consultants',
                                    icon: 'psychology',
                                    color: 'purple',
                                    title: 'Pengaturan Konsultasi',
                                    desc: 'Atur kategori dan pakar konsultasi (Admin)'
                                }
                            ]
                        }
                    ];


                    const canSeeAnyAdminMenu = adminSections.some(section => section.items.some(item => item.access));
                    if (!canSeeAnyAdminMenu) return null;

                    return (
                        <div className="space-y-10">
                            {adminSections.map((section, idx) => {
                                const visibleItems = section.items.filter(item => item.access);
                                if (visibleItems.length === 0) return null;

                                return (
                                    <div key={idx} className="admin-category-section">
                                        <div className="relative py-4 mb-4">
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className="w-full border-t border-gray-200"></div>
                                            </div>
                                            <div className="relative flex justify-start">
                                                <span className="pr-4 bg-gray-50 text-[11px] font-black text-green-700 uppercase tracking-[0.15em] flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    {section.title}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {visibleItems.map((item) => (
                                                <Link
                                                    key={item.id}
                                                    to={item.to}
                                                    className={`flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-${item.color}-50 hover:shadow-md transition relative`}
                                                >
                                                    {item.badge > 0 && (
                                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 animate-bounce">
                                                            {item.badge}
                                                        </div>
                                                    )}
                                                    <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center`}>
                                                        <span className={`material-icons text-${item.color}-700`}>{item.icon}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>
                                                        <p className="text-[11px] text-gray-500">{item.desc}</p>
                                                    </div>
                                                    <span className="material-icons text-gray-400">chevron_right</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );

                })()}
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
                                <CurrencyInput
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="!px-4 !py-3 !bg-gray-100 !border-none !rounded-xl"
                                    placeholder="Contoh: 50000"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Donasi Program Sosial (Opsional)</label>
                                <CurrencyInput
                                    value={donationAmount}
                                    onChange={(e) => setDonationAmount(e.target.value)}
                                    className="!px-4 !py-3 !bg-gray-100 !border-none !rounded-xl"
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
