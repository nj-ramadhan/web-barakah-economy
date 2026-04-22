import React, { useState } from 'react';
import { manualRegisterParticipant } from '../../services/eventApi';

const EventManualRegistrationModal = ({ isOpen, onClose, event, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        responses: {}
    });

    if (!isOpen || !event) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await manualRegisterParticipant(event.slug, formData);
            onSuccess();
            onClose();
            // Reset form
            setFormData({ name: '', email: '', phone: '', responses: {} });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal mendaftarkan peserta secara manual.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResponseChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            responses: {
                ...prev.responses,
                [fieldId]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl relative my-auto animate-scale-up border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">Tambah Peserta Manual</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">PENDAFTARAN ADMIN: {event.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition shadow-sm border border-gray-100"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                            <span className="material-icons text-lg">error_outline</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Standard Fields */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nama Lengkap *</label>
                                <input
                                    required
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email (Opsional)</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                        placeholder="peserta@email.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">No. WhatsApp *</label>
                                    <input
                                        required
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleFormChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                        placeholder="0812XXXXXXXX"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Event Fields */}
                            {event.form_fields && event.form_fields.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 mt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                                        Data Tambahan Event
                                    </h3>
                                    <div className="space-y-4">
                                        {event.form_fields.map(field => {
                                            // Skip fields that we likely already covered with name/email/phone
                                            const label = field.label.toLowerCase();
                                            if (label.includes('nama lengkap') || label.includes('email') || label.includes('wa') || label.includes('handphone') || label.includes('whatsapp')) {
                                                // Keep them but maybe they'll redundant? Let's just show them for data completeness if needed.
                                            }

                                            return (
                                                <div key={field.id} className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                                        {field.label} {field.required ? '*' : '(Opsional)'}
                                                    </label>
                                                    {field.field_type === 'select' ? (
                                                        <select
                                                            required={field.required}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none appearance-none"
                                                        >
                                                            <option value="">Pilih Opsi</option>
                                                            {(field.options || []).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            required={field.required}
                                                            type={field.field_type === 'number' ? 'number' : 'text'}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition outline-none"
                                                            placeholder={field.label}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl text-sm font-extrabold uppercase tracking-widest shadow-xl hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {loading ? 'MENYIMPAN...' : 'TAMBAH PESERTA'}
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6 px-10 leading-relaxed italic">
                        * Pendaftaran manual akan otomatis disetujui, generate tiket, dan mengirim notifikasi WhatsApp ke peserta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EventManualRegistrationModal;
