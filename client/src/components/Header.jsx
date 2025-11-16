import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useState } from 'react';
import SettingsModal from './SettingsModal';

function Header() {
  const { user, isAdmin, logout } = useAuthStore(state => ({
    user: state.user,
    isAdmin: state.isAdmin(),
    logout: state.logout
  }));
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-card border-b border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <Link to="/" className="text-lg md:text-2xl font-bold text-white hover:text-green-400 transition-colors">
              <span className="hidden sm:inline">🎯 Mileage Riot | Аукцион</span>
              <span className="sm:hidden">🎯 MR</span>
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-2 py-1.5 md:px-4 md:py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold rounded-lg transition-colors text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Админ-панель</span>
                  <span className="sm:hidden">Админ</span>
                </Link>
              )}

              {isAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm md:text-base"
                >
                  <span className="hidden sm:inline">⚙️ Настройки</span>
                  <span className="sm:hidden">⚙️</span>
                </button>
              )}

              <div className="flex items-center gap-2 md:gap-3 bg-slate-900 rounded-lg px-2 py-1.5 md:px-4 md:py-2 border border-slate-700">
                {user?.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-green-400"
                  />
                )}
                <div className="hidden sm:block">
                  <div className="text-white font-semibold text-sm md:text-base">{user?.username}</div>
                  <div className="flex items-center gap-2 text-xs">
                    {isAdmin && (
                      <span className="text-yellow-400 font-semibold">Admin</span>
                    )}
                    {isAdmin && user?.balance !== undefined && (
                      <span className="text-slate-500">•</span>
                    )}
                    {user?.balance !== undefined && (
                      <span className="text-green-400 font-mono font-semibold">
                        {user.balance.toFixed(2)} M¢
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-2 py-1.5 md:px-4 md:py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
              >
                <span className="hidden sm:inline">Выйти</span>
                <span className="sm:hidden">✕</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

export default Header;
