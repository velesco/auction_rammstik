import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authApi } from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    authApi.redirectToHub();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full p-6 md:p-8 bg-slate-800 rounded-xl md:rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            Виртуальный Аукцион
          </h1>
          <p className="text-sm md:text-base text-slate-400">Mileage Riot</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-3 md:py-4 px-4 md:px-6 bg-green-500 hover:bg-green-600 text-white font-bold text-base md:text-lg rounded-lg md:rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
        >
          Войти через Hub
        </button>

        <p className="mt-4 md:mt-6 text-center text-xs md:text-sm text-slate-400">
          Вход осуществляется через hub.mileageriot.com
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
