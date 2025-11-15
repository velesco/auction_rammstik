import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useAuctionStore from './store/auctionStore';
import socketService from './services/socket';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import AuctionPage from './pages/AuctionPage';
import AdminPage from './pages/AdminPage';
import LotPage from './pages/LotPage';

// Components
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const { isAuthenticated, token, updateUser } = useAuthStore();
  const loadSettings = useAuctionStore(state => state.loadSettings);

  useEffect(() => {
    // Load settings from localStorage
    loadSettings();

    // Connect to socket if authenticated
    if (isAuthenticated) {
      socketService.connect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, loadSettings]);

  // Auto-refresh user balance every 2 minutes
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const refreshBalance = async () => {
      try {
        const response = await axios.get(`${API_URL}/user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data) {
          updateUser(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    };

    // Refresh immediately on mount
    refreshBalance();

    // Then refresh every 2 minutes
    const interval = setInterval(refreshBalance, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, updateUser]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <AuctionPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      <Route
        path="/lot/:id"
        element={
          <PrivateRoute>
            <LotPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
