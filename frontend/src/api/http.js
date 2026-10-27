import axios from 'axios';
import { useAuthStore } from '../stores/auth.store.js';
import router from '../router/index.js';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use(
  (config) => {
    const auth = useAuthStore();
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || '';

    const esLogin = url.includes('/auth/login') || url.includes('/auth/registro');

    if (status === 401 && !esLogin) {
      const auth = useAuthStore();
      auth.logout();
      router.push('/login');
    }

    return Promise.reject(error);
  }
);

export default http;
