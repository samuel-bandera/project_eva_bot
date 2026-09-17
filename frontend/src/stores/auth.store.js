import { defineStore } from 'pinia';
import http from '../api/http.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isLogged: (s) => !!s.token,
    isProfesor: (s) => s.user?.tipo === 'profesor',
    isAlumno: (s) => s.user?.tipo === 'alumno',
  },

  actions: {
    async login(usuario, contrasena) {
      const { data } = await http.post('/auth/login', { usuario, contrasena });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    },

    async register(payload) {
      const { data } = await http.post('/auth/register', payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});