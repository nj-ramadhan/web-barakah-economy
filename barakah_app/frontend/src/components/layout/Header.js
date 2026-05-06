// components/layout/Header.js
import { Link } from 'react-router-dom';
import '../../styles/Header.css';

const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-[1001] lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="container px-4 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-green-50 rounded-xl group-hover:bg-green-100 transition">
            <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
          </div>
          <span className="text-xl font-black text-green-800 tracking-tighter">BARAKAH ECONOMY</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={localStorage.getItem('user') ? "/profile" : "/login"}
            className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 rounded-full overflow-hidden border border-gray-200"
          >
            {(() => {
              const userStr = localStorage.getItem('user');
              if (userStr) {
                try {
                  const user = JSON.parse(userStr);
                  if (user.picture) {
                    return <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />;
                  }
                } catch (e) {}
                return <span className="material-icons text-xl">account_circle</span>;
              }
              return <span className="material-icons text-xl">login</span>;
            })()}
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;