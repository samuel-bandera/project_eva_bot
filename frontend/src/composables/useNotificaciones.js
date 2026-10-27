import { ref, onMounted, onUnmounted } from 'vue';
import * as notiApi from '../api/notificaciones.api.js';

export function useNotificaciones() {
  const noLeidas = ref(0);
  const notificaciones = ref([]);
  const cargando = ref(false);
  const bloqueado = ref(false);
  let intervalo = null;

  async function cargarNotificaciones() {
    if (bloqueado.value) return;
    cargando.value = true;
    try {
      const [count, lista] = await Promise.all([
        notiApi.getNoLeidas(),
        notiApi.listarNotificaciones({ limit: 10 }),
      ]);
      noLeidas.value = count || 0;
      notificaciones.value = lista || [];
      bloqueado.value = false;
    } catch (e) {
      if (e.response?.status === 429) {
        bloqueado.value = true;
        console.warn('[Notificaciones] Rate limit alcanzado. Pausando polling por 60s.');
        setTimeout(() => { bloqueado.value = false; }, 60000);
      }
    } finally {
      cargando.value = false;
    }
  }

  async function marcarComoLeida(id) {
    try {
      await notiApi.marcarComoLeida(id);
      const notif = notificaciones.value.find((n) => n.id === id);
      if (notif && !notif.leida) {
        notif.leida = true;
        noLeidas.value = Math.max(0, noLeidas.value - 1);
      }
    } catch (e) {
      console.error('[Notificaciones] Error marcando como leída:', e);
    }
  }

  async function marcarTodasComoLeidas() {
    try {
      await notiApi.marcarTodasComoLeidas();
      notificaciones.value.forEach((n) => { n.leida = true; });
      noLeidas.value = 0;
    } catch (e) {
      console.error('[Notificaciones] Error marcando todas:', e);
    }
  }

  function recibirNotificacionEnVivo(datos) {
    if (!datos) return;
    notificaciones.value.unshift({
      id: datos.id || Date.now(),
      titulo: datos.titulo,
      mensaje: datos.mensaje,
      leida: false,
      fecha: datos.fecha || new Date().toISOString(),
      tipo: datos.tipo,
      url: datos.url,
    });
    noLeidas.value += 1;
  }

  onMounted(() => {
    cargarNotificaciones();
    intervalo = setInterval(cargarNotificaciones, 30000);
  });

  onUnmounted(() => {
    if (intervalo) clearInterval(intervalo);
  });

  return {
    noLeidas,
    cantidadNoLeidas: noLeidas,
    notificaciones,
    cargando,
    cargarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas,
    recibirNotificacionEnVivo,
  };
}
