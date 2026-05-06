import { Link } from 'react-router-dom';
import '../../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
          <span className="text-sm font-black text-green-800 tracking-tighter">BARAKAH ECONOMY</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;