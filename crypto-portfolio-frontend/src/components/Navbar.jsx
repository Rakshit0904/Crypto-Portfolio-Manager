import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Wallet, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400">
        <Wallet className="w-6 h-6" />
        <span>CoinLedger</span>
      </Link>

      {user && (
        <div className="flex items-center gap-5">
          <Link to="/" className="text-slate-300 hover:text-white text-sm font-medium">
            Dashboard
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium"
          >
            <User className="w-4 h-4" />
            <span>{user.name}</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
}