import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store.js';

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
  },
  {
    path: '/profesor',
    name: 'profesor-dashboard',
    component: () => import('../views/profesor/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'profesor' },
  },
  {
    path: '/alumno',
    name: 'alumno-dashboard',
    component: () => import('../views/alumno/DashboardView.vue'),
    meta: { requiresAuth: true, role: 'alumno' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.token) return { name: 'login' };
  if (to.meta.role && auth.user?.tipo !== to.meta.role) {
    return { name: 'login' };
  }
});

export default router;