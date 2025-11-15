import axios from 'axios';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Lots API
export const lotsApi = {
  getAll: (status) => {
    const params = status ? { status } : {};
    return api.get('/lots', { params });
  },
  getById: (id) => api.get(`/lots/${id}`),
  getBids: (id) => api.get(`/lots/${id}/bids`)
};

// Admin API
export const adminApi = {
  createLot: (data) => api.post('/admin/lots', data),
  updateLot: (id, data) => api.put(`/admin/lots/${id}`, data),
  startLot: (id) => api.post(`/admin/lots/${id}/start`),
  endLot: (id) => api.post(`/admin/lots/${id}/end`),
  deleteLot: (id) => api.delete(`/admin/lots/${id}`)
};

// OAuth Hub Integration
export const authApi = {
  // Redirect to Hub OAuth
  redirectToHub: () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const hubAuthUrl = `${HUB_URL}/oauth/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = hubAuthUrl;
  },

  // Handle OAuth callback
  handleCallback: async (code) => {
    // This would be handled by Hub - we receive the token directly
    return { token: code };
  },

  // Verify token with Hub
  verifyToken: async (token) => {
    try {
      const response = await axios.post(`${HUB_URL}/api/auth/validate-jwt`, {
        token
      });
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  }
};

export default api;
