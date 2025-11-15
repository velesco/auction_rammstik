import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const setAuth = useAuthStore(state => state.setAuth);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const token = searchParams.get('token');

        if (!token) {
          setError('Токен не получен от Hub');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        const response = await axios.get(`${API_URL}/user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          setAuth(response.data, token);
          navigate('/', { replace: true });
        } else {
          throw new Error('Invalid user data');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Ошибка авторизации');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuth();
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
        {error ? (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Ошибка</h2>
            <p className="text-slate-300">{error}</p>
            <p className="text-sm text-slate-400 mt-4">
              Перенаправление на страницу входа...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Авторизация
            </h2>
            <p className="text-slate-400">Проверка токена...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;
