import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import authService from '../services/auth';
import '../styles/Body.css';
  
const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(amount);
};

const ProfileEditPage = () => {
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
    picture: null, // Initialize picture as null
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
        ...prevProfile,
        [name]: name === 'work_salary' ? formatIDR(value.replace(/[^0-9]/g, '')) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfile((prevProfile) => ({
        ...prevProfile,
        picture: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            // Create a FormData object
            const formData = new FormData();

            // Append all fields to the FormData object
            for (const key in profile) {
                if (profile[key] !== null && profile[key] !== undefined) {
                    // Append files directly, and other fields as strings
                    if (key === 'picture' && profile[key] instanceof File) {
                        formData.append(key, profile[key]);
                    } else if (key === 'work_salary') {
                        formData.append(key, profile[key].replace(/[^0-9]/g, '')); // Parse salary back to number
                    } else {
                        formData.append(key, profile[key]);
                    }
                }
            }

            // Append the existing picture URL if the picture is not changed
            if (!(profile.picture instanceof File)) {
                formData.delete('picture'); // Remove the picture field if it's not a file
            }

            // Update profile data using FormData
            await authService.updateProfile(user.id, formData);
            alert('Data Profile berhasil diperbaharui');
            navigate('/profile'); // Redirect to the profile page
        }
    } catch (error) {
        alert('Data Profile gagal diperbaharui');
        console.error('Failed to update profile:', error);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Nama Lengkap</label>
              <input
                type="text"
                name="name_full"
                placeholder="Nama Lengkap"
                value={profile.name_full}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Gender */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Jenis Kelamin</label>
              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Jenis Kelamin</option>
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </div>

            {/* Birth Date */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Tanggal Lahir</label>
              <input
                type="date"
                name="birth_date"
                value={profile.birth_date}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Birth Place */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Tempat Lahir</label>
              <input
                type="text"
                name="birth_place"
                placeholder="Tempat Lahir"
                value={profile.birth_place}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Marital Status */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Status Pernikahan</label>
              <select
                name="marital_status"
                value={profile.marital_status}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Status Pernikahan</option>
                <option value="bn">Belum Nikah</option>
                <option value="n">Nikah</option>
                <option value="d">Duda</option>
                <option value="j">Janda</option>
              </select>
            </div>

            {/* Segment */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Segment</label>
              <select
                name="segment"
                value={profile.segment}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Segment</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="pelajar">Pelajar</option>
                <option value="santri">Santri</option>
                <option value="karyawan">Karyawan</option>
                <option value="umum">Umum</option>
              </select>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-4">
            {/* Address */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Alamat</label>
              <input
                type="text"
                name="address"
                placeholder="Alamat"
                value={profile.address}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Address Latitude */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Latitude</label>
              <input
                type="number"
                name="address_latitude"
                placeholder="Latitude"
                value={profile.address_latitude}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Address Longitude */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Longitude</label>
              <input
                type="number"
                name="address_longitude"
                placeholder="Longitude"
                value={profile.address_longitude}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Address Province */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Provinsi</label>
              <select
                name="address_province"
                value={profile.address_province}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Provinsi</option>
                <option value="aceh">Aceh</option>
                <option value="sumatera_utara">Sumatera Utara</option>
                <option value="sumatera_barat">Sumatera Barat</option>
                <option value="riau">Riau</option>
                <option value="jambi">Jambi</option>
                <option value="sumatera_selatan">Sumatera Selatan</option>
                <option value="bengkulu">Bengkulu</option>
                <option value="lampung">Lampung</option>
                <option value="kepulauan_bangka_belitung">Kepulauan Bangka Belitung</option>
                <option value="kepulauan_riau">Kepulauan Riau</option>
                <option value="dki_jakarta">DKI Jakarta</option>
                <option value="jawa_barat">Jawa Barat</option>
                <option value="jawa_tengah">Jawa Tengah</option>
                <option value="di_yogyakarta">DI Yogyakarta</option>
                <option value="jawa_timur">Jawa Timur</option>
                <option value="banten">Banten</option>
                <option value="bali">Bali</option>
                <option value="nusa_tenggara_barat">Nusa Tenggara Barat</option>
                <option value="nusa_tenggara_timur">Nusa Tenggara Timur</option>
                <option value="kalimantan_barat">Kalimantan Barat</option>
                <option value="kalimantan_tengah">Kalimantan Tengah</option>
                <option value="kalimantan_selatan">Kalimantan Selatan</option>
                <option value="kalimantan_timur">Kalimantan Timur</option>
                <option value="kalimantan_utara">Kalimantan Utara</option>
                <option value="sulawesi_utara">Sulawesi Utara</option>
                <option value="sulawesi_tengah">Sulawesi Tengah</option>
                <option value="sulawesi_selatan">Sulawesi Selatan</option>
                <option value="sulawesi_tenggara">Sulawesi Tenggara</option>
                <option value="gorontalo">Gorontalo</option>
                <option value="sulawesi_barat">Sulawesi Barat</option>
                <option value="maluku">Maluku</option>
                <option value="maluku_utara">Maluku Utara</option>
                <option value="papua">Papua</option>
                <option value="papua_barat">Papua Barat</option>
              </select>
            </div>
          </div>
        );

      case 'study':
        return (
          <div className="space-y-4">
            {/* Study Level */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Tingkat Pendidikan</label>
              <select
                name="study_level"
                value={profile.study_level}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Tingkat Pendidikan</option>
                <option value="sd">Sekolah Dasar atau Setara</option>
                <option value="smp">Sekolah Menengah Pertama atau Setara</option>
                <option value="sma">Sekolah Menengah Atas / Kejuruan atau Setara</option>
                <option value="s1">Sarjana</option>
                <option value="s2">Magister</option>
                <option value="s3">Doktor</option>
              </select>
            </div>

            {/* Study Campus */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Kampus</label>
              <input
                type="text"
                name="study_campus"
                placeholder="Kampus"
                value={profile.study_campus}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Faculty */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Fakultas</label>
              <input
                type="text"
                name="study_faculty"
                placeholder="Fakultas"
                value={profile.study_faculty}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Department */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Jurusan</label>
              <input
                type="text"
                name="study_department"
                placeholder="Jurusan"
                value={profile.study_department}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Program */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Program Studi</label>
              <input
                type="text"
                name="study_program"
                placeholder="Program Studi"
                value={profile.study_program}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Semester */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Semester</label>
              <input
                type="number"
                name="study_semester"
                placeholder="Semester"
                value={profile.study_semester}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Start Year */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Tahun Mulai</label>
              <input
                type="number"
                name="study_start_year"
                placeholder="Tahun Mulai"
                value={profile.study_start_year}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Study Finish Year */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Tahun Selesai</label>
              <input
                type="number"
                name="study_finish_year"
                placeholder="Tahun Selesai"
                value={profile.study_finish_year}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="space-y-4">
            {/* Job */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Pekerjaan</label>
              <select
                name="job"
                value={profile.job}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Pekerjaan</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="asn">Aparatur Sipil Negara</option>
                <option value="karyawan_swasta">Karyawan Swasta</option>
                <option value="guru">Guru</option>
                <option value="dosen">Dosen</option>
                <option value="dokter">Dokter</option>
                <option value="perawat">Perawat</option>
                <option value="apoteker">Apoteker</option>
                <option value="programmer">Programmer</option>
                <option value="data_scientist">Data Scientist</option>
                <option value="desainer_grafis">Desainer Grafis</option>
                <option value="marketing">Marketing</option>
                <option value="hrd">HRD (Human Resources Department)</option>
                <option value="akuntan">Akuntan</option>
                <option value="konsultan">Konsultan</option>
                <option value="arsitek">Arsitek</option>
                <option value="insinyur">Insinyur</option>
                <option value="peneliti">Peneliti</option>
                <option value="jurnalis">Jurnalis</option>
                <option value="penulis">Penulis</option>
                <option value="penerjemah">Penerjemah</option>
                <option value="pilot">Pilot</option>
                <option value="pramugari">Pramugari</option>
                <option value="chef">Chef</option>
                <option value="pengusaha">Pengusaha</option>
                <option value="petani">Petani</option>
                <option value="nelayan">Nelayan</option>
                <option value="pengrajin">Pengrajin</option>
                <option value="teknisi">Teknisi</option>
                <option value="seniman">Seniman</option>
                <option value="musisi">Musisi</option>
                <option value="atlet">Atlet</option>
                <option value="polisi">Polisi</option>
                <option value="tentara">Tentara</option>
                <option value="pengacara">Pengacara</option>
                <option value="notaris">Notaris</option>
                <option value="psikolog">Psikolog</option>
                <option value="sopir">Sopir</option>
                <option value="kurir">Kurir</option>
                <option value="barista">Barista</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>

            {/* Work Field */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Bidang Pekerjaan</label>
              <select
                name="work_field"
                value={profile.work_field}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Pilih Bidang Pekerjaan</option>
                <option value="pendidikan">Pendidikan</option>
                <option value="kesehatan">Kesehatan</option>
                <option value="ekobis">Ekonomi Bisnis</option>
                <option value="agrotek">Agrotek</option>
                <option value="herbal">Herbal-Farmasi</option>
                <option value="it">IT</option>
                <option value="manufaktur">Manufaktur</option>
                <option value="energi">Energi-Mineral</option>
                <option value="sains">Sains</option>
                <option value="teknologi">Teknologi</option>
                <option value="polhuk">Politik-Hukum</option>
                <option value="humaniora">Humaniora</option>
                <option value="media">Media-Literasi</option>
                <option value="sejarah">Sejarah</option>
              </select>
            </div>

            {/* Work Institution */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Institusi</label>
              <input
                type="text"
                name="work_institution"
                placeholder="Institusi"
                value={profile.work_institution}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Work Position */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Posisi</label>
              <input
                type="text"
                name="work_position"
                placeholder="Posisi"
                value={profile.work_position}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {/* Work Salary */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Gaji</label>
              <input
                type="text"
                name="work_salary"
                placeholder="Gaji"
                value={profile.work_salary}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="body">
      <Header />
      <div className="container">
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          <div className="p-4">
            <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                <img
                    src={profile.picture || `${process.env.REACT_APP_API_BASE_URL}/media/profile_images/pas_foto_standard.png`} // Default placeholder image
                    alt="Profile"
                    className="w-full h-full object-cover"
                />
            </div> 
            <input
                type="file"
                onChange={handleFileChange}
                className="w-full p-2 border rounded-lg"
                defaultValue={profile.picture}
            />
            <form onSubmit={handleSubmit}>
              {/* Tabs */}
              <div className="flex space-x-4 border-b">
                <button
                  type="button"
                  className={`py-2 px-4 material-icons ${activeTab === 'general' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('general')}
                >
                  info
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 material-icons ${activeTab === 'address' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('address')}
                >
                  location_on
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 material-icons ${activeTab === 'study' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('study')}
                >
                  school
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 material-icons ${activeTab === 'work' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('work')}
                >
                  work
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {renderTabContent()}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center mt-4"
              >
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default ProfileEditPage;