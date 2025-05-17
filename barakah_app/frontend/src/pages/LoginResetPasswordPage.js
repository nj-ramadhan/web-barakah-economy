import { useState } from 'react';
import Header from '../components/layout/Header';
import { Link } from 'react-router-dom';
import axios from 'axios';

const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
};

const ResetPasswordPage = () => {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');
  const token = params.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/password-reset-confirm/`, {
      uid,
      token,
      new_password: newPassword,
      headers: headers,
    });
    setDone(true);
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
              {done ? (
                  <p>Password reset successful. You can now log in.</p>
              ) : (
                  <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        className="w-full p-2 border rounded-lg mb-4"
                    />
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center"
                    >
                        Atur Ulang Kata Sandi
                    </button>
                  </form>
              )}
          </div>
        </div>
    </div>
  );
};

export default ResetPasswordPage;