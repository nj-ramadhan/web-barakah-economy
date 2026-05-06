import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfileModal.css';

const UserProfileModal = ({ userId, isOpen, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchPublicProfile();
    }
  }, [isOpen, userId]);

  const fetchPublicProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/profiles/${userId}/public/`,
        { headers: { Authorization: `Bearer ${user.access}` } }
      );
      setProfile(res.data);
    } catch (err) {
      console.error('Error fetching public profile:', err);
      setError('Gagal memuat profil pengguna.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-profile-modal-overlay" onClick={onClose}>
      <div className="user-profile-modal-container animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <button className="user-profile-modal-close" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>

        {loading ? (
          <div className="user-profile-modal-loading">
            <div className="spinner"></div>
            <p>Memuat profil...</p>
          </div>
        ) : error ? (
          <div className="user-profile-modal-error">
            <span className="material-icons text-red-500 text-4xl mb-2">error_outline</span>
            <p>{error}</p>
          </div>
        ) : profile ? (
          <div className="user-profile-modal-content">
            <div className="user-profile-modal-header">
              <div className="user-profile-modal-avatar">
                <img
                  src={profile.picture || profile.google_picture_url || '/media/profile_images/pas_foto_standard.png'}
                  alt={profile.nickname || profile.username}
                  onError={(e) => { e.target.src = '/media/profile_images/pas_foto_standard.png'; }}
                />
              </div>
              <div className="user-profile-modal-titles">
                <h2 className="text-xl font-black text-gray-900">{profile.nickname || profile.name_full || profile.username}</h2>
                {(profile.nickname && profile.name_full) && <p className="text-xs text-gray-400 font-bold -mt-1">{profile.name_full}</p>}
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">@{profile.username}</p>
                
                {profile.labels && profile.labels.length > 0 && (
                  <div className="user-profile-modal-labels">
                    {profile.labels.map((label, idx) => (
                      <span key={idx} className="user-label-badge">
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="user-profile-modal-info">
              <div className="info-item">
                <span className="material-icons">location_on</span>
                <div>
                  <label>Provinsi</label>
                  <p>{profile.province_name || 'Tidak diketahui'}</p>
                </div>
              </div>
            </div>

            <div className="user-profile-modal-shops">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Toko & Layanan</h3>
              <div className="shop-links">
                {profile.has_digital_products && (
                  <Link to={`/digital-produk/${profile.username}`} className="shop-link digital" onClick={onClose}>
                    <span className="material-icons">cloud_download</span>
                    <span>Produk Digital</span>
                  </Link>
                )}
                {profile.has_courses && (
                  <Link to={`/ecourse/instructor/${profile.username}`} className="shop-link course" onClick={onClose}>
                    <span className="material-icons">school</span>
                    <span>E-Course</span>
                  </Link>
                )}
                {profile.has_physical_products && (
                  <Link to={`/produk-fisik/${profile.username}`} className="shop-link sinergy" onClick={onClose}>
                    <span className="material-icons">shopping_bag</span>
                    <span>Sinergy Shop</span>
                  </Link>
                )}
                {!profile.has_digital_products && !profile.has_courses && !profile.has_physical_products && (
                  <p className="text-xs text-gray-400 italic py-2">Pengguna ini belum memiliki produk atau layanan.</p>
                )}
              </div>
            </div>
            
            <div className="user-profile-modal-footer">
               <button className="btn-primary-small" onClick={onClose}>Tutup</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserProfileModal;
