// pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import authService from '../services/auth';
import '../styles/Body.css';

const formatDate = (dateData) => {
    if (!dateData) return 'tidak ada';
    const date = new Date(dateData);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
    }).format(amount);
};

const GENDER_CHOICES = {
    'l': 'Laki-laki',
    'p': 'Perempuan',
};

const MARITAL_CHOICES = {
    'bn': 'Belum Nikah',
    'n': 'Nikah',
    'd': 'Duda',
    'j': 'Janda',
};

const SEGMENT_CHOICES = {
    'mahasiswa': 'Mahasiswa',
    'pelajar': 'Pelajar',
    'santri': 'Santri',
    'karyawan': 'Karyawan',
    'umum': 'Umum',
};

const STUDY_LEVEL_CHOICES = {
    'sd': 'Sekolah Dasar atau Setara',
    'smp': 'Sekolah Menengah Pertama atau Setara',
    'sma': 'Sekolah Menengah Atas / Kejuruan atau Setara',
    's1': 'Sarjana',
    's2': 'Magister',
    's3': 'Doktor',
};

const JOB_CHOICES = {
    'mahasiswa': 'Mahasiswa',
    'asn': 'Aparatur Sipil Negara',
    'karyawan_swasta': 'Karyawan Swasta',
    'guru': 'Guru',
    'dosen': 'Dosen',
    'dokter': 'Dokter',
    'perawat': 'Perawat',
    'apoteker': 'Apoteker',
    'programmer': 'Programmer',
    'data_scientist': 'Data Scientist',
    'desainer_grafis': 'Desainer Grafis',
    'marketing': 'Marketing',
    'hrd': 'HRD (Human Resources Department)',
    'akuntan': 'Akuntan',
    'konsultan': 'Konsultan',
    'arsitek': 'Arsitek',
    'insinyur': 'Insinyur',
    'peneliti': 'Peneliti',
    'jurnalis': 'Jurnalis',
    'penulis': 'Penulis',
    'penerjemah': 'Penerjemah',
    'pilot': 'Pilot',
    'pramugari': 'Pramugari',
    'chef': 'Chef',
    'pengusaha': 'Pengusaha',
    'petani': 'Petani',
    'nelayan': 'Nelayan',
    'pengrajin': 'Pengrajin',
    'teknisi': 'Teknisi',
    'seniman': 'Seniman',
    'musisi': 'Musisi',
    'atlet': 'Atlet',
    'polisi': 'Polisi',
    'tentara': 'Tentara',
    'pengacara': 'Pengacara',
    'notaris': 'Notaris',
    'psikolog': 'Psikolog',
    'sopir': 'Sopir',
    'kurir': 'Kurir',
    'barista': 'Barista',
    'freelancer': 'Freelancer',
};

const WORK_FIELD_CHOICES = {
    'pendidikan': 'Pendidikan',
    'kesehatan': 'Kesehatan',
    'ekobis': 'Ekonomi Bisnis',
    'agrotek': 'Agrotek',
    'herbal': 'Herbal-Farmasi',
    'it': 'IT',
    'manufaktur': 'Manufaktur',
    'energi': 'Energi-Mineral',
    'sains': 'Sains',
    'teknologi': 'Teknologi',
    'polhuk': 'Politik-Hukum',
    'humaniora': 'Humaniora',
    'media': 'Media-Literasi',
    'sejarah': 'Sejarah',
};

const PROVINCE_CHOICES = {
    'aceh': 'Aceh',
    'sumatera_utara': 'Sumatera Utara',
    'sumatera_barat': 'Sumatera Barat',
    'riau': 'Riau',
    'jambi': 'Jambi',
    'sumatera_selatan': 'Sumatera Selatan',
    'bengkulu': 'Bengkulu',
    'lampung': 'Lampung',
    'kepulauan_bangka_belitung': 'Kepulauan Bangka Belitung',
    'kepulauan_riau': 'Kepulauan Riau',
    'dki_jakarta': 'DKI Jakarta',
    'jawa_barat': 'Jawa Barat',
    'jawa_tengah': 'Jawa Tengah',
    'di_yogyakarta': 'DI Yogyakarta',
    'jawa_timur': 'Jawa Timur',
    'banten': 'Banten',
    'bali': 'Bali',
    'nusa_tenggara_barat': 'Nusa Tenggara Barat',
    'nusa_tenggara_timur': 'Nusa Tenggara Timur',
    'kalimantan_barat': 'Kalimantan Barat',
    'kalimantan_tengah': 'Kalimantan Tengah',
    'kalimantan_selatan': 'Kalimantan Selatan',
    'kalimantan_timur': 'Kalimantan Timur',
    'kalimantan_utara': 'Kalimantan Utara',
    'sulawesi_utara': 'Sulawesi Utara',
    'sulawesi_tengah': 'Sulawesi Tengah',
    'sulawesi_selatan': 'Sulawesi Selatan',
    'sulawesi_tenggara': 'Sulawesi Tenggara',
    'gorontalo': 'Gorontalo',
    'sulawesi_barat': 'Sulawesi Barat',
    'maluku': 'Maluku',
    'maluku_utara': 'Maluku Utara',
    'papua': 'Papua',
    'papua_barat': 'Papua Barat',
};

const ProfileInfoItem = ({ label, value, icon, fullWidth = false }) => (
    <div className={`p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3 ${fullWidth ? 'col-span-full' : ''}`}>
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-50 flex items-center justify-center shrink-0">
            <span className="material-icons text-green-600 text-lg">{icon}</span>
        </div>
        <div className="flex-1 overflow-hidden">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
            <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
                {value || <span className="text-gray-300 font-normal italic">belum diisi</span>}
            </p>
        </div>
    </div>
);

const CoursesTab = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/enrollments/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                // res.data is expected to be a list of enrollments
                // we should filter for only verified ones if the API doesn't do it
                setCourses(res.data.filter(e => e.payment_status === 'verified' || e.payment_status === 'paid'));
            } catch (err) {
                console.error('Error fetching courses:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const CourseSkeleton = () => (
        <div className="space-y-4 animate-pulse">
            <h2 className="font-bold text-gray-800 w-32 h-5 bg-gray-200 rounded mb-3"></h2>
            <div className="grid grid-cols-1 gap-3">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="flex gap-2 mb-2">
                                <div className="h-4 bg-gray-100 rounded w-16"></div>
                                <div className="h-4 bg-gray-100 rounded w-16"></div>
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                        </div>
                        <div className="w-16 h-8 bg-gray-200 rounded-full"></div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) return <CourseSkeleton />;

    return (
        <div className="space-y-4">
            <h2 className="font-bold text-gray-800">E-Course Saya</h2>
            {courses.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-sm">Belum ada e-course yang diikuti</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {courses.map(enroll => (
                        <div key={enroll.id} className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
                            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="material-icons text-green-600">school</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-gray-800">{enroll.course_title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <span className="material-icons text-[10px]">person</span>
                                        {enroll.student_count || 0} Siswa
                                    </span>
                                    <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <span className="material-icons text-[10px]">video_library</span>
                                        {enroll.material_count || 0} Materi
                                    </span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1">Terdaftar: {formatDate(enroll.enrolled_at)}</p>
                            </div>
                            <Link
                                to={`/kelas/buka/${enroll.course_slug}`}
                                className="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold"
                            >
                                Buka
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PurchasesTab = () => {
    const [purchases, setPurchases] = useState([]);
    const [physicalOrders, setPhysicalOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyType, setHistoryType] = useState('digital'); // 'digital' or 'sinergy'

    useEffect(() => {
        const fetchAllHistory = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            setLoading(true);
            try {
                // Fetch Digital
                const resDigital = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/orders/my-purchases/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setPurchases(resDigital.data);

                // Fetch Sinergy (Physical)
                const resSinergy = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setPhysicalOrders(resSinergy.data);
            } catch (err) {
                console.error('Error fetching purchase history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllHistory();
    }, []);

    const PurchaseSkeleton = () => (
        <div className="space-y-4 animate-pulse">
            <div className="flex gap-2 mb-4">
                <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
            </div>
            <div className="space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white p-3 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded-full w-16"></div>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <div className="h-3 bg-gray-100 rounded w-24"></div>
                            <div className="h-3 bg-gray-100 rounded w-20"></div>
                        </div>
                        <div className="mt-3 pt-2 border-t flex justify-end">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) return <PurchaseSkeleton />;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Riwayat Transaksi</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                    <button 
                        onClick={() => setHistoryType('digital')}
                        className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${historyType === 'digital' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        Digital
                    </button>
                    <button 
                        onClick={() => setHistoryType('sinergy')}
                        className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${historyType === 'sinergy' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400'}`}
                    >
                        Sinergy
                    </button>
                </div>
            </div>

            {historyType === 'digital' ? (
                purchases.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed text-xs">
                        Belum ada riwayat pembelian produk digital
                    </div>
                ) : (
                    <div className="space-y-3">
                        {purchases.map(order => (
                            <div key={order.id} className="bg-white p-3 rounded-xl border shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-sm font-bold text-gray-800">{order.product_title}</h3>
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Terverifikasi</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                    <span>#{order.order_number}</span>
                                    <span>{formatDate(order.created_at)}</span>
                                </div>
                                <div className="mt-3 pt-2 border-t flex justify-between items-center">
                                    <span className="text-xs font-black text-gray-900">Rp {formatIDR(order.price)}</span>
                                    <Link to={`/digital-products/${order.product_slug}`} className="text-[10px] text-green-600 font-bold hover:underline">Detail Produk</Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                physicalOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed text-xs">
                        Belum ada riwayat belanja produk Sinergy
                    </div>
                ) : (
                    <div className="space-y-3">
                        {physicalOrders.map(order => {
                            const status = (order.status || '').toLowerCase();
                            let badgeStyle = 'bg-gray-50 text-gray-500';
                            if (['paid', 'berhasil', 'success'].includes(status)) badgeStyle = 'bg-emerald-50 text-emerald-600';
                            else if (['shipped', 'dikirim'].includes(status)) badgeStyle = 'bg-blue-50 text-blue-600';
                            else if (['pending', 'menunggu'].includes(status)) badgeStyle = 'bg-amber-50 text-amber-600';
                            else if (['failed', 'gagal', 'batal'].includes(status)) badgeStyle = 'bg-red-50 text-red-600';

                            return (
                                 <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-black text-gray-900 tracking-tight">Order #{order.order_number}</h3>
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${badgeStyle}`}>
                                            {order.status || 'Pending'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 my-3">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="text-[11px] text-gray-600 flex justify-between items-center bg-gray-50/50 p-2 rounded-lg">
                                                <span className="font-bold">{item.product_name} <span className="text-gray-400 font-medium">x{item.quantity}</span></span>
                                                <span className="font-black text-gray-400">{formatIDR(item.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-50 mt-3">
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <span className="material-icons text-xs">calendar_today</span>
                                            <span className="text-[10px] font-bold">{formatDate(order.created_at)}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Grand Total</p>
                                            <p className="text-sm font-black text-emerald-600">Rp {formatIDR(order.grand_total || order.total_price)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Link to="/riwayat-belanja" className="text-[10px] bg-gray-900 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center gap-2">
                                            Detail Lacak <span className="material-icons text-xs">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

const DonationsTab = () => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDonations = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/donations/donation/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setDonations(res.data);
            } catch (err) {
                console.error('Error fetching donations:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDonations();
    }, []);

    if (loading) return (
        <div className="space-y-3 animate-pulse">
            <div className="p-4 bg-gray-50 rounded-xl mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>)}
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center px-1">
                <h2 className="font-bold text-gray-800">Riwayat Donasi</h2>
                <Link to="/donasi" className="text-[10px] bg-green-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider hover:bg-green-700 transition-colors">Donasi Lagi</Link>
            </div>
            {donations.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <span className="material-icons text-4xl mb-2 opacity-20">volunteer_activism</span>
                    <p className="text-sm font-medium">Belum ada riwayat donasi</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {donations.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-50 bg-gray-50">
                                <img 
                                    src={item.campaign?.thumbnail || '/images/default-campaign.jpg'} 
                                    alt="Campaign" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = '/images/default-campaign.jpg'; }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">{item.campaign_title || 'Donasi Tanpa Judul'}</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[11px] text-emerald-600 font-black">Rp {formatIDR(item.amount)}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{formatDate(item.created_at)}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                                <span className="material-icons text-green-500 text-lg">check_circle</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ShoppingTab = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="font-bold text-gray-800 px-1">Belanja & Incaran</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/keranjang" className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-3xl text-white shadow-xl shadow-emerald-100 flex flex-col gap-4 transition-all hover:-translate-y-1 active:scale-[0.98]">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <span className="material-icons text-2xl">shopping_cart</span>
                    </div>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Keranjang Belanja</h3>
                        <p className="text-[10px] opacity-80 font-medium mt-1 leading-relaxed">Selesaikan belanjaan yang masih tersimpan</p>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <span className="material-icons text-sm">arrow_forward</span>
                    </div>
                </Link>

                <Link to="/incaran" className="bg-gradient-to-br from-rose-500 to-pink-600 p-5 rounded-3xl text-white shadow-xl shadow-rose-100 flex flex-col gap-4 transition-all hover:-translate-y-1 active:scale-[0.98]">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <span className="material-icons text-2xl">favorite</span>
                    </div>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Produk Incaran</h3>
                        <p className="text-[10px] opacity-80 font-medium mt-1 leading-relaxed">Cek kembali produk yang Anda minati</p>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <span className="material-icons text-sm">arrow_forward</span>
                    </div>
                </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mt-8">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Butuh Bantuan Belanja?</h4>
                <div className="space-y-3">
                    <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-green-300 transition-colors group">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                            <span className="material-icons text-green-500 group-hover:text-white transition-colors">whatsapp</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black text-gray-700">Chat Admin Support</p>
                            <p className="text-[10px] text-gray-400 font-medium">Bantuan cepat via WhatsApp</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        name_full: '',
        gender: '',
        birth_date: '',
        birth_place: '',
        marital_status: '',
        segment: '',
        study_level: '',
        study_campus: '',
        study_faculty: '',
        study_department: '',
        study_program: '',
        study_semester: '',
        study_start_year: '',
        study_finish_year: '',
        address: '',
        job: '',
        work_field: '',
        work_institution: '',
        work_position: '',
        work_salary: '',
        address_latitude: '',
        address_longitude: '',
        address_province: '',
        picture: '', // Profile picture URL
        username: '',
        email: '',
    });

    const [activeTab, setActiveTab] = useState('general');
    const [loadingProfile, setLoadingProfile] = useState(true);
    // Change password state
    const [showChangePwModal, setShowChangePwModal] = useState(false);
    const [changePwForm, setChangePwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [changePwLoading, setChangePwLoading] = useState(false);
    const [changePwError, setChangePwError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user && user.id) {
                    const profileData = await authService.getProfile(user.id); // Fetch profile data
                    setProfile(profileData);
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangePwError('');
        if (changePwForm.new_password !== changePwForm.confirm_password) {
            setChangePwError('Konfirmasi password tidak cocok.');
            return;
        }
        if (changePwForm.new_password.length < 8) {
            setChangePwError('Password baru minimal 8 karakter.');
            return;
        }
        setChangePwLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/auth/change-password/`,
                changePwForm,
                { headers: { Authorization: `Bearer ${user.access}`, 'Content-Type': 'application/json' } }
            );
            alert('Password berhasil diubah! Silakan login kembali.');
            setShowChangePwModal(false);
            setChangePwForm({ old_password: '', new_password: '', confirm_password: '' });
            // Logout setelah ganti password karena token lama sudah tidak valid
            localStorage.removeItem('user');
            window.location.href = '/login';
        } catch (err) {
            setChangePwError(err.response?.data?.error || 'Gagal mengubah password.');
        } finally {
            setChangePwLoading(false);
        }
    };

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-4">
                        {/* Full Name */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Nama Lengkap</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.name_full || '-'}</p>
                        </div>

                        {/* Gender */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Jenis Kelamin</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">
                                {GENDER_CHOICES[profile.gender] || '-'}
                            </p>
                        </div>

                        {/* Birth Date */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Tanggal Lahir</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{formatDate(profile.birth_date) || '-'}</p>
                        </div>

                        {/* Birth Place */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Tempat Lahir</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.birth_place || '-'}</p>
                        </div>

                        {/* Marital Status */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Status Pernikahan</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">
                                {MARITAL_CHOICES[profile.marital_status] || '-'}
                            </p>
                        </div>

                        {/* Segment */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Segment</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{SEGMENT_CHOICES[profile.segment] || '-'}</p>
                        </div>
                    </div>
                );

            case 'address':
                return (
                    <div className="space-y-4">
                        {/* Address */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Alamat</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.address || '-'}</p>
                        </div>

                        {/* Address Latitude */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Latitude</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.address_latitude || '-'}</p>
                        </div>

                        {/* Address Longitude */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Longitude</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.address_longitude || '-'}</p>
                        </div>

                        {/* Address Province */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Provinsi</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{PROVINCE_CHOICES[profile.address_province] || '-'}</p>
                        </div>
                    </div>
                );

            case 'study':
                return (
                    <div className="space-y-4">
                        {/* Study Level */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Tingkat Pendidikan</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{STUDY_LEVEL_CHOICES[profile.study_level] || '-'}</p>
                        </div>

                        {/* Study Campus */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Kampus</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_campus || '-'}</p>
                        </div>

                        {/* Study Faculty */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Fakultas</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_faculty || '-'}</p>
                        </div>

                        {/* Study Department */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Jurusan</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_department || '-'}</p>
                        </div>

                        {/* Study Program */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Program Studi</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_program || '-'}</p>
                        </div>

                        {/* Study Semester */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Semester</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_semester || '-'}</p>
                        </div>

                        {/* Study Start Year */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Tahun Mulai</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_start_year || '-'}</p>
                        </div>

                        {/* Study Finish Year */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Tahun Selesai</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.study_finish_year || '-'}</p>
                        </div>
                    </div>
                );

            case 'work':
                return (
                    <div className="space-y-4">
                        {/* Job */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Pekerjaan</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{JOB_CHOICES[profile.job] || '-'}</p>
                        </div>

                        {/* Work Field */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Bidang Pekerjaan</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{WORK_FIELD_CHOICES[profile.work_field] || '-'}</p>
                        </div>

                        {/* Work Institution */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Institusi</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.work_institution || '-'}</p>
                        </div>

                        {/* Work Position */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Posisi</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">{profile.work_position || '-'}</p>
                        </div>

                        {/* Work Salary */}
                        <div className="w-full">
                            <label className="block text-gray-700 font-medium mb-1">Gaji</label>
                            <p className="w-full p-2 border rounded-lg bg-gray-100">Rp. {formatIDR(profile.work_salary) || '-'}</p>
                        </div>
                    </div>
                );

            case 'courses':
                return <CoursesTab />;

            case 'purchases':
                return <PurchasesTab />;

            default:
                return null;
        }
    };

    return (
        <div className="body">
            <Helmet>
                <meta name="description" content="Lengkapi data anggota, bantu kembangkan aplikasi menjadi lebih Barakah" />
                <meta property="og:title" content="BARAKAH APP" />
                <meta property="og:description" content="Lengkapi data anggota, bantu kembangkan aplikasi menjadi lebih Barakah" />
                <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
            </Helmet>

            <Header />
            <div className="max-w-6xl mx-auto px-4">
                {loadingProfile ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden mt-6 animate-pulse p-4 mb-20">
                        <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-32 h-32 rounded-full bg-gray-200 border-2 border-gray-100"></div>
                            <div className="w-full flex gap-2 border-b pb-2">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-12 h-8 bg-gray-200 rounded"></div>)}
                            </div>
                            <div className="w-full space-y-4 mt-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="w-full">
                                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                                        <div className="h-10 bg-gray-100 border rounded-lg w-full"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mt-6 pb-24 max-w-4xl mx-auto">
                    {/* Header Banner */}
                    <div className="h-32 bg-gradient-to-r from-green-600 to-emerald-700 relative">
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-1 py-1 bg-white rounded-full shadow-lg">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white">
                                <img
                                    src={profile.picture ? (profile.picture.startsWith('http') ? profile.picture : `${process.env.REACT_APP_API_BASE_URL}${profile.picture}`) : `${process.env.REACT_APP_API_BASE_URL}/media/profile_images/pas_foto_standard.png`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-6">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900">{profile.name_full || profile.username || 'Anggota Barakah'}</h3>
                            <p className="text-sm text-gray-500 font-medium">{profile.email || 'tanpa email'}</p>
                            <div className="flex justify-center gap-2 mt-3">
                                {profile.is_verified_member && (
                                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-blue-100">
                                        <span className="material-icons text-xs">verified</span>
                                        Anggota Terverifikasi
                                    </span>
                                )}
                                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-100 uppercase">
                                    {SEGMENT_CHOICES[profile.segment] || 'Umum'}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats/Links */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <Link to="/profile/edit" className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold transition">
                                <span className="material-icons text-sm">edit</span>
                                Edit Profil
                            </Link>
                            <Link to="/dashboard" className="flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl text-sm font-bold transition">
                                <span className="material-icons text-sm">dashboard</span>
                                Dashboard
                            </Link>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-1 mb-6 bg-gray-50 p-1.5 rounded-2xl">
                            {[
                                { id: 'general', icon: 'person', label: 'Data Diri' },
                                { id: 'address', icon: 'location_on', label: 'Alamat' },
                                { id: 'study', icon: 'school', label: 'Pendidikan' },
                                { id: 'work', icon: 'work', label: 'Pekerjaan' },
                                { id: 'shop', icon: 'storefront', label: 'Toko' },
                                { id: 'courses', icon: 'school', label: 'Kelas' },
                                { id: 'shopping', icon: 'shopping_bag', label: 'Belanja' },
                                { id: 'charity', icon: 'volunteer_activism', label: 'Donasi' },
                                { id: 'purchases', icon: 'history', label: 'Riwayat' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-green-700 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <span className="material-icons text-lg">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content Area */}
                        <div className="min-h-[300px]">
                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Informasi Pribadi</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ProfileInfoItem label="Nama Lengkap" value={profile.name_full} icon="badge" />
                                        <ProfileInfoItem label="NIK / No. KTP" value={profile.nik} icon="fingerprint" />
                                        <ProfileInfoItem label="Jenis Kelamin" value={GENDER_CHOICES[profile.gender]} icon="wc" />
                                        <ProfileInfoItem label="Tgl Lahir" value={formatDate(profile.birth_date)} icon="calendar_today" />
                                        <ProfileInfoItem label="Tempat Lahir" value={profile.birth_place} icon="map" />
                                        <ProfileInfoItem label="Status Pernikahan" value={MARITAL_CHOICES[profile.marital_status]} icon="favorite" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'address' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Lokasi & Pengiriman</h4>
                                    <div className="bg-emerald-50 rounded-2xl p-4 mb-4 border border-emerald-100 flex gap-3">
                                        <span className="material-icons text-emerald-600">info</span>
                                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">Data kelurahan digunakan untuk menghitung biaya ongkir dari kurir Sinergy kami.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ProfileInfoItem label="Provinsi" value={profile.address_province} icon="domain" />
                                        <ProfileInfoItem label="Kota / Kabupaten" value={profile.address_city_name} icon="location_city" />
                                        <ProfileInfoItem label="Kecamatan" value={profile.address_subdistrict_name} icon="home_work" />
                                        <ProfileInfoItem label="Kelurahan / Desa" value={profile.address_village_name} icon="holiday_village" />
                                        <ProfileInfoItem label="Alamat Lengkap" value={profile.address} icon="place" fullWidth />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'study' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Riwayat Pendidikan</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ProfileInfoItem label="Tingkat" value={STUDY_LEVEL_CHOICES[profile.study_level]} icon="layers" />
                                        <ProfileInfoItem label="Kampus / Sekolah" value={profile.study_campus} icon="account_balance" />
                                        <ProfileInfoItem label="Fakultas" value={profile.study_faculty} icon="domain" />
                                        <ProfileInfoItem label="Jurusan / Prodi" value={profile.study_program || profile.study_department} icon="architecture" />
                                        <ProfileInfoItem label="Semester Current" value={profile.study_semester} icon="numbers" />
                                        <ProfileInfoItem label="Periode" value={profile.study_start_year ? `${profile.study_start_year} - ${profile.study_finish_year || 'Sekarang'}` : null} icon="date_range" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'work' && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Informasi Karir</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ProfileInfoItem label="Pekerjaan" value={JOB_CHOICES[profile.job]} icon="business_center" />
                                        <ProfileInfoItem label="Bidang" value={WORK_FIELD_CHOICES[profile.work_field]} icon="category" />
                                        <ProfileInfoItem label="Instansi" value={profile.work_institution} icon="apartment" />
                                        <ProfileInfoItem label="Posisi" value={profile.work_position} icon="badge" />
                                        <ProfileInfoItem label="Estimasi Gaji" value={profile.work_salary ? `Rp ${formatIDR(profile.work_salary)}` : null} icon="payments" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shop' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Pengaturan Toko Digital</h4>
                                        <Link to={`/digital-produk/${profile.username || ''}`} className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-1 hover:underline">
                                            Kunjungi Toko <span className="material-icons text-xs">open_in_new</span>
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ProfileInfoItem label="Deskripsi Toko" value={profile.shop_description} icon="description" fullWidth />
                                        <ProfileInfoItem label="Tema Warna" value={profile.shop_theme_color} icon="palette" />
                                        <ProfileInfoItem label="Gaya Font" value={profile.shop_font} icon="font_download" />
                                        <ProfileInfoItem label="Kurir Aktif" value={profile.shop_supported_couriers?.toUpperCase()} icon="local_shipping" fullWidth />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'courses' && <CoursesTab />}
                            {activeTab === 'purchases' && <PurchasesTab />}
                            {activeTab === 'charity' && <DonationsTab />}
                            {activeTab === 'shopping' && <ShoppingTab />}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-12 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowChangePwModal(true)}
                                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
                            >
                                <span className="material-icons">lock</span>
                                GANTI KATA SANDI
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('access_token');
                                    localStorage.removeItem('refresh_token');
                                    window.location.href = '/login';
                                }}
                                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <span className="material-icons">logout</span>
                                KELUAR DARI APLIKASI
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">Barakah App v2.5 • 2026</p>
                        </div>
                    </div>
                </div>
                )}
            </div>
            <NavigationButton />

            {/* ======= MODAL GANTI PASSWORD ======= */}
            {showChangePwModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end justify-center p-4 sm:items-center">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                            <h2 className="text-lg font-black flex items-center gap-2">
                                <span className="material-icons">lock</span> Ganti Kata Sandi
                            </h2>
                            <p className="text-blue-100 text-xs mt-1">Setelah berhasil, Anda akan diminta login ulang</p>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            {changePwError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <p className="text-sm text-red-600">{changePwError}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password Lama</label>
                                <input
                                    type="password"
                                    placeholder="Masukkan password lama"
                                    value={changePwForm.old_password}
                                    onChange={e => setChangePwForm(f => ({ ...f, old_password: e.target.value }))}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password Baru</label>
                                <input
                                    type="password"
                                    placeholder="Minimal 8 karakter"
                                    value={changePwForm.new_password}
                                    onChange={e => setChangePwForm(f => ({ ...f, new_password: e.target.value }))}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    placeholder="Ulangi password baru"
                                    value={changePwForm.confirm_password}
                                    onChange={e => setChangePwForm(f => ({ ...f, confirm_password: e.target.value }))}
                                    required
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${changePwForm.confirm_password && changePwForm.new_password !== changePwForm.confirm_password ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-200'}`}
                                />
                                {changePwForm.confirm_password && changePwForm.new_password !== changePwForm.confirm_password && (
                                    <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowChangePwModal(false); setChangePwError(''); setChangePwForm({ old_password: '', new_password: '', confirm_password: '' }); }}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={changePwLoading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {changePwLoading ? (
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                    ) : (
                                        <span className="material-icons text-sm">save</span>
                                    )}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;