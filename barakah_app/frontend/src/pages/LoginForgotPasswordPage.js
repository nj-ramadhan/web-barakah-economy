import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); // harus di baris pertama!
    if (!email) { setError('Masukkan email Anda.'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/password-reset/`,
        { email, frontend_url: window.location.origin },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setSent(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-3xl">lock_reset</span>
            </div>
            <h1 className="text-2xl font-black">Lupa Kata Sandi?</h1>
            <p className="text-white/80 text-sm mt-2">Masukkan email dan kami akan kirim tautan reset</p>
          </div>

          <div className="p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-icons text-green-600 text-3xl">mark_email_read</span>
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Email Terkirim!</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Kami telah mengirimkan tautan reset ke <span className="font-bold text-green-700">{email}</span>.
                  Periksa inbox atau folder spam Anda.
                </p>
                <p className="text-xs text-gray-400 mb-6">Tautan akan kedaluwarsa dalam 24 jam.</p>
                <Link to="/login" className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-center transition">
                  Kembali ke Halaman Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Terdaftar</label>
                  <input
                    type="email"
                    placeholder="contoh@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Mengirim...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="material-icons text-sm">send</span>
                      Kirim Tautan Reset
                    </span>
                  )}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-sm text-gray-500 hover:text-green-700 font-medium transition">
                    Kembali ke Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;