import React, { useState, useEffect } from 'react';
import siteContentService from '../../services/siteContent';
import { getMediaUrl } from '../../utils/mediaUtils';

const DashboardAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'announcement',
    content: '',
    target_url: '',
    start_at: '',
    end_at: '',
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await siteContentService.getAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('type', formData.type);
    data.append('content', formData.content);
    data.append('target_url', formData.target_url);
    if (formData.start_at) data.append('start_at', formData.start_at);
    if (formData.end_at) data.append('end_at', formData.end_at);
    data.append('is_active', formData.is_active);
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      if (editingId) {
        await siteContentService.updateAnnouncement(editingId, data);
      } else {
        await siteContentService.createAnnouncement(data);
      }
      setShowModal(false);
      resetForm();
      fetchAnnouncements();
      alert('Berhasil menyimpan pengumuman');
    } catch (err) {
      console.error('Failed to save announcement:', err);
      alert('Gagal menyimpan pengumuman');
    }
  };

  const handleEdit = (ann) => {
    setEditingId(ann.id);
    setFormData({
      title: ann.title,
      type: ann.type,
      content: ann.content || '',
      target_url: ann.target_url || '',
      start_at: ann.start_at ? new Date(ann.start_at).toISOString().slice(0, 16) : '',
      end_at: ann.end_at ? new Date(ann.end_at).toISOString().slice(0, 16) : '',
      is_active: ann.is_active,
    });
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus pengumuman ini?')) {
      try {
        await siteContentService.deleteAnnouncement(id);
        fetchAnnouncements();
      } catch (err) {
        console.error('Failed to delete announcement:', err);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      type: 'announcement',
      content: '',
      target_url: '',
      start_at: '',
      end_at: '',
      is_active: true,
    });
    setImageFile(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Manajemen Pengumuman</h1>
          <p className="text-sm text-gray-500">Kelola pop-up pengumuman dan iklan aplikasi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition"
        >
          <span className="material-icons">add</span>
          Buat Baru
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {ann.image && (
                <div className="h-40 bg-gray-100 relative">
                  <img src={getMediaUrl(ann.image)} alt={ann.title} className="w-full h-full object-cover" />
                  {!ann.is_active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Nonaktif</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{ann.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-1">{ann.content}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ann.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {ann.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(ann)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition">
                      <span className="material-icons text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(ann.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition">
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-gray-900">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-icons">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tipe</label>
                    <select 
                      value={formData.type} 
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                    >
                      <option value="promotion">Promosi</option>
                      <option value="update">Update Terbaru</option>
                      <option value="announcement">Pengumuman</option>
                      <option value="info">Informasi</option>
                      <option value="other">Lain-lain</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Judul Pengumuman</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.title} 
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                      placeholder="Masukkan judul..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Waktu Mulai</label>
                    <input 
                      type="datetime-local" 
                      value={formData.start_at} 
                      onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Waktu Selesai</label>
                    <input 
                      type="datetime-local" 
                      value={formData.end_at} 
                      onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Isi Pengumuman</label>
                  <textarea 
                    rows="4" 
                    value={formData.content} 
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                    placeholder="Masukkan isi pengumuman (opsional)..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Banner / Gambar</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setImageFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-[10px] text-gray-400 mt-2 italic">*Kosongkan jika tidak ingin mengubah gambar</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tautan (URL)</label>
                  <input 
                    type="url" 
                    value={formData.target_url} 
                    onChange={e => setFormData({ ...formData, target_url: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="is_active" 
                    checked={formData.is_active} 
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-gray-700 select-none">Aktifkan Pengumuman</label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition"
                >
                  {editingId ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAnnouncementsPage;
