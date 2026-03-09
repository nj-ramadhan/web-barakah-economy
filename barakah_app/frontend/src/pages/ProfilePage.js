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

    if (loading) return <div className="text-center py-4">Loading...</div>;

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPurchases = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) return;
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/orders/my-purchases/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setPurchases(res.data);
            } catch (err) {
                console.error('Error fetching purchases:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPurchases();
    }, []);

    if (loading) return <div className="text-center py-4">Loading...</div>;

    return (
        <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Riwayat Pembelian Digital</h2>
            {purchases.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-sm">Belum ada riwayat pembelian</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {purchases.map(order => (
                        <div key={order.id} className="bg-white p-3 rounded-xl border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-bold text-gray-800">{order.product_title}</h3>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Verified</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                                <span>Order: {order.order_number}</span>
                                <span>Rp. {formatIDR(order.amount)}</span>
                            </div>
                            <div className="mt-3 pt-2 border-t flex justify-end">
                                <button className="text-green-600 text-xs font-bold flex items-center gap-1">
                                    <span className="material-icons text-xs">download</span>
                                    Akses Produk
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
    });

    const [activeTab, setActiveTab] = useState('general'); // State to manage active tab

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
                <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-4">Profile</h3>
                        <div className="flex flex-col items-center space-y-4">
                            {/* Profile Picture */}
                            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                                <img
                                    src={profile.picture || `${process.env.REACT_APP_API_BASE_URL}/media/profile_images/pas_foto_standard.png`} // Default placeholder image
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Tabs */}
                            <div className="w-full">
                                <div className="flex flex-wrap gap-2 border-b">
                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'general' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('general')}
                                    >
                                        info
                                    </button>
                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'address' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('address')}
                                    >
                                        location_on
                                    </button>
                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'study' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('study')}
                                    >
                                        school
                                    </button>
                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'work' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('work')}
                                    >
                                        work
                                    </button>

                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'courses' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('courses')}
                                        title="E-Course Saya"
                                    >
                                        school
                                    </button>
                                    <button
                                        className={`py-2 px-4 material-icons ${activeTab === 'purchases' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                                        onClick={() => setActiveTab('purchases')}
                                        title="Riwayat Pembelian Digital"
                                    >
                                        history
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="mt-4">
                                    {renderTabContent()}
                                </div>
                            </div>

                            {/* Lihat Toko Button */}
                            <Link
                                to={`/${profile.username || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                            >
                                <span className="material-icons text-lg">storefront</span>
                                Lihat Toko Saya
                            </Link>

                            {/* Edit Button */}
                            <Link
                                to="/profile/edit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                            >
                                Edit Profile
                            </Link>

                            {/* Dashboard Button */}
                            <Link
                                to="/dashboard"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <span className="material-icons text-lg">dashboard</span>
                                Dashboard
                            </Link>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                            >
                                <span className="material-icons text-lg">logout</span>
                                Keluar Aplikasi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default ProfilePage;