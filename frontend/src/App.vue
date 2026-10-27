<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useAuthStore } from './stores/auth.store.js';
import { useIdleTimeout } from './composables/useIdleTimeout.js';
import AvisoSesionInactiva from './components/AvisoSesionInactiva.vue';
import { useTheme } from './composables/useTheme.js';

useTheme();

const router = useRouter();
const auth = useAuthStore();

const { iniciar, detener, activo } = useIdleTimeout();

function alExpirarSesion(evento) {
  const motivo = evento?.detail?.motivo || 'inactividad';
  auth.logout();
  router.push('/login');
  Notify.create({
    message:
      motivo === 'manual'
        ? 'Sesión cerrada'
        : 'Tu sesión se cerró por inactividad. Volvé a iniciar sesión.',
    color: 'info',
    icon: 'lock_clock',
    position: 'top-right',
    timeout: 5000,
  });
}

onMounted(() => {
  window.addEventListener('sesion-expirada', alExpirarSesion);
  if (auth.token) iniciar();
});

onUnmounted(() => {
  window.removeEventListener('sesion-expirada', alExpirarSesion);
  detener();
});

watch(
  () => auth.token,
  (nuevoToken) => {
    if (nuevoToken) iniciar();
    else detener();
  }
);
</script>

<template>
  <router-view />

  <AvisoSesionInactiva v-if="auth.token && activo" />
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app {
  min-height: 100vh;
}
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  transition: background-color 0.25s ease, color 0.25s ease;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.evalbot-notify {
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
  font-family: inherit !important;
  font-weight: 500 !important;
}

.evalbot-notify .q-notification__message {
  font-size: 13px !important;
  line-height: 1.4 !important;
}
</style>
