import { useState } from 'react';
import Header from '../components/layout/Header';
import axios from 'axios';

const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
};

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {

    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      console.error('CSRF token not found');
      return;
    }

    // Set the headers for the request
    const headers = {
      'Content-Type': 'multipart/form-data',
      'X-CSRFToken': csrfToken,
    };

    e.preventDefault();
    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/password-reset/`, {
      email,
      frontend_url: window.location.origin,
      headers: headers,
    });
    setSent(true);
  };

  return (
    <div className="body">
    <Header />
    <div className="container">
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6"></div>
            <div className="p-4">
                <h3 className="text-xl font-bold mb-4">Silakan Atur Ulang Kata Sandi</h3>
                <div className="mb-3 mt-4 bg-green-50 p-3 rounded-lg text-sm border border-green-200">
                    <p className="text-green-800">
                    Silahkan atur ulang kata sandi anda untuk mengakses fitur khusus
                    </p>        
                </div>
                    {sent ? (
                        <p>Check your email for a reset link.</p>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <input
                                type="email"
                                placeholder="Masukkan email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full p-2 border rounded-lg mb-4"
                            />
                            <button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                            >
                                Kirim Tautan Atur Ulang Kata Sandi
                            </button>
                        </form>
                    )}
            </div>
        </div> 
    </div>
  );
};

export default ForgotPasswordPage;