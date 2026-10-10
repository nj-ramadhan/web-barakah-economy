import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const CHECK_INTERVAL = 3 * 60 * 1000; // Cek setiap 3 menit
const CURRENT_VERSION_KEY = '__app_build_version__';

export default function AutoVersionUpdater() {
  const location = useLocation();
  const isCheckingRef = useRef(false);

  const checkVersion = async (isRouteTransition = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Ambil version.json dengan parameter waktu agar tidak ter-cache oleh browser
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data?.version;

      if (!serverVersion) return;

      const localVersion = localStorage.getItem(CURRENT_VERSION_KEY);

      if (!localVersion) {
        // Penyimpanan pertama kali saat web dibuka
        localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);
        return;
      }

      // Jika versi di server berbeda dari yang sedang dibuka user
      if (serverVersion !== localVersion) {
        console.warn(`[AutoVersionUpdater] Update versi terdeteksi! Server: ${serverVersion}, Klien: ${localVersion}. Memperbarui aplikasi...`);
        
        // Simpan versi baru agar tidak looping reload
        localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);

        // Hapus Cache API jika Service Worker digunakan
        if ('caches' in window) {
          try {
            const cacheNames = await window.caches.keys();
            await Promise.all(cacheNames.map(name => window.caches.delete(name)));
          } catch (e) {
            console.error('Gagal membersihkan cache storage:', e);
          }
        }

        // Unregister service worker jika ada update penting
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.update();
            }
          } catch (e) {
            console.error('Gagal update service worker:', e);
          }
        }

        // Lakukan reload halaman untuk mengambil bundle JS/CSS baru
        window.location.reload(true);
      }
    } catch (err) {
      // Abaikan error jaringan saat pengecekan di background
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Cek saat pertama kali load dan setiap kali user berpindah halaman
  useEffect(() => {
    checkVersion(true);
  }, [location.pathname]);

  // Cek saat interval berjalan & saat tab aktif kembali
  useEffect(() => {
    const interval = setInterval(() => {
      checkVersion(false);
    }, CHECK_INTERVAL);

    const onFocus = () => {
      checkVersion(false);
    };

    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
