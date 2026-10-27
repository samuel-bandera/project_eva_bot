import { defineStore } from 'pinia';
import http from '../api/http.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isLogged: (s) => !!s.token,
    isProfesor: (s) => s.user?.tipo === 'docente',
    isAlumno: (s) => s.user?.tipo === 'alumno',
    isAdmin: (s) => s.user?.tipo === 'admin',
    isCoordinador: (s) => s.user?.tipo === 'coordinador',

    nombreCompleto: (s) =>
      `${s.user?.nombre ?? ''} ${s.user?.apellido ?? ''}`.trim(),

    iniciales: (s) => {
      const n = s.user?.nombre?.[0] ?? '';
      const a = s.user?.apellido?.[0] ?? '';
      return (n + a).toUpperCase() || 'A';
    },
  },

  actions: {
    async login(usuario, contrasena) {
      const { data } = await http.post('/auth/login', { usuario, contrasena });

      const token = data?.data?.token;
      const user = data?.data?.usuario;

      if (!token || !user) {
        throw new Error('Respuesta del servidor inválida');
      }

      this.token = token;
      this.user = user;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    },

    async register({ nombre, apellido, usuario, email, contrasena, tipo = 'alumno' }) {
      const { data } = await http.post('/auth/registro', {
        nombre,
        apellido,
        usuario,
        email,
        contrasena,
        tipo,
      });

      return data;
    },

    async fetchPerfil() {
      const { data } = await http.get('/auth/perfil');
      const user = data?.data?.usuario;
      if (user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
      }
      return data?.data;
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
