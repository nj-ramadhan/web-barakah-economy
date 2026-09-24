import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { safeStorage } from '../../utils/storageUtils';
import './UserProfileModal.css';

const UserProfileModal = ({ userId, isOpen, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const currentUser = safeStorage.getUser();

  useEffect(() => {
    if (isOpen && userId) {
      fetchPublicProfile();
    }
  }, [isOpen, userId]);

  const fetchPublicProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/profiles/${userId}/public/`);
      setProfile(res.data);
      setIsFollowing(Boolean(res.data.is_following));
      setFollowersCount(res.data.followers_count || 0);
      setFollowingCount(res.data.following_count || 0);
    } catch (err) {
      console.error('Error fetching public profile:', err);
      if (err.response && err.response.status === 404) {
        setError('Profil pengguna tidak ditemukan.');
      } else {
        setError('Gagal memuat profil pengguna. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      alert('Silakan login terlebih dahulu untuk mengikuti pengguna.');
      return;
    }
    setFollowLoading(true);
    try {
      const targetId = profile.user_id || userId;
      const res = await api.post(`/profiles/${targetId}/toggle-follow/`);
      setIsFollowing(res.data.is_following);
      setFollowersCount(res.data.followers_count);
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal mengubah status mengikuti.';
      alert(msg);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!isOpen) return null;

  const isOwnProfile = currentUser && (currentUser.id === profile?.user_id || currentUser.username === profile?.username);

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
              <div className="user-profile-modal-avatar flex items-center justify-center bg-green-600 text-white font-bold text-3xl">
                {profile.picture || profile.google_picture_url ? (
                  <img
                    src={profile.picture || profile.google_picture_url}
                    alt={profile.nickname || profile.username}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const container = e.target.parentElement;
                      if (container) {
                        const initial = (profile.nickname || profile.name_full || profile.username || '?').charAt(0).toUpperCase();
                        container.innerHTML = `<span style="font-size: 2.25rem; font-weight: 800;">${initial}</span>`;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(profile.nickname || profile.name_full || profile.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
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

                {/* Follower & Following Stats */}
                <div className="flex items-center justify-center gap-6 mt-3 py-2 px-4 bg-white/80 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="text-center">
                    <span className="block text-sm font-black text-gray-900">{followersCount}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pengikut</span>
                  </div>
                  <div className="h-5 w-[1px] bg-gray-200"></div>
                  <div className="text-center">
                    <span className="block text-sm font-black text-gray-900">{followingCount}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mengikuti</span>
                  </div>
                  {profile.shop_likes_count !== undefined && (
                    <>
                      <div className="h-5 w-[1px] bg-gray-200"></div>
                      <div className="text-center">
                        <span className="block text-sm font-black text-emerald-700">{profile.shop_likes_count || 0}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suka</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Follow Button (if not own profile) */}
                {currentUser && !isOwnProfile && (
                  <div className="flex justify-center mt-3">
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                      className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        isFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                      }`}
                    >
                      <span className="material-icons text-sm">{isFollowing ? 'check' : 'person_add'}</span>
                      <span>{isFollowing ? 'Mengikuti' : 'Ikuti'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="user-profile-modal-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="material-icons">location_city</span>
                  <div>
                    <label>Kota / Kabupaten</label>
                    <p>{profile.city_name || profile.address_city_name || 'Belum diisi'}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="material-icons">map</span>
                  <div>
                    <label>Provinsi</label>
                    <p>{profile.province_name || profile.address_province || 'Belum diisi'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="user-profile-modal-shops">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Toko &amp; Layanan</h3>
              <div className="shop-links">
                {/* Barakah Store links directly to /store/{shop_name || username} which combines physical, digital & ecourses */}
                {(profile.has_physical_products || profile.has_digital_products || profile.has_courses || profile.shop_name) ? (
                  <Link 
                    to={`/store/${profile.shop_name || profile.username}`} 
                    className="shop-link store" 
                    onClick={onClose}
                  >
                    <span className="material-icons">storefront</span>
                    <span>{profile.shop_name ? `Toko ${profile.shop_name}` : 'Barakah Store'}</span>
                  </Link>
                ) : (
                  <p className="text-xs text-gray-400 italic py-2">Pengguna ini belum memiliki produk atau toko.</p>
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
