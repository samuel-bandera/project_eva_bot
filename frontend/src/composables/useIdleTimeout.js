import { ref, computed } from 'vue';
import { Notify } from 'quasar';

const TIEMPO_DEFAULT_SEG = 2 * 60 * 60;

function leerConfig() {
  const override = localStorage.getItem('IDLE_TIMEOUT_SEG');
  const total = override ? Number(override) : TIEMPO_DEFAULT_SEG;
  return {
    total,
    aviso5: Math.min(5 * 60, total * 0.5),
    aviso1: Math.min(1 * 60, total * 0.15),
  };
}

const config = leerConfig();

const segundosRestantes = ref(config.total);
const advertenciaActiva = ref(false);
const nivelAdvertencia = ref(0);
const activo = ref(false);
const cerrando = ref(false);

let intervaloId = null;
let eventosRegistrados = false;

function leerActividad() {
  if (!activo.value) return;
  if (advertenciaActiva.value) return;
  segundosRestantes.value = config.total;
}

function resetear() {
  segundosRestantes.value = config.total;
  advertenciaActiva.value = false;
  nivelAdvertencia.value = 0;
  cerrando.value = false;
}

function limpiarIntervalo() {
  if (intervaloId) {
    clearInterval(intervaloId);
    intervaloId = null;
  }
}

function limpiarEventos() {
  if (!eventosRegistrados) return;
  const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  eventos.forEach((ev) => document.removeEventListener(ev, leerActividad));
  eventosRegistrados = false;
}

export function useIdleTimeout() {
  const minutosRestantes = computed(() => Math.max(0, Math.ceil(segundosRestantes.value / 60)));
  const segundosVisibles = computed(() => Math.max(0, segundosRestantes.value));

  function extenderSesion() {
    if (!activo.value) return;
    resetear();
    Notify.create({
      message: 'Sesión extendida',
      color: 'positive',
      icon: 'check_circle',
      position: 'top-right',
      timeout: 3000,
    });
  }

  function cerrarSesionAhora(motivo = 'inactividad') {
    if (cerrando.value) return;
    cerrando.value = true;
    limpiarIntervalo();
    limpiarEventos();
    activo.value = false;

    window.dispatchEvent(new CustomEvent('sesion-expirada', { detail: { motivo } }));
  }

  function tick() {
    if (!activo.value || cerrando.value) return;

    segundosRestantes.value -= 1;

    if (segundosRestantes.value <= config.aviso1 && nivelAdvertencia.value < 2) {
      nivelAdvertencia.value = 2;
      advertenciaActiva.value = true;
      Notify.create({
        message: '⚠️ Tu sesión se cerrará en menos de 1 minuto',
        color: 'negative',
        icon: 'warning',
        position: 'top-right',
        timeout: 10000,
      });
    }
    else if (segundosRestantes.value <= config.aviso5 && nivelAdvertencia.value < 1) {
      nivelAdvertencia.value = 1;
      advertenciaActiva.value = true;
      Notify.create({
        message: 'Tu sesión se cerrará en 5 minutos por inactividad',
        color: 'warning',
        icon: 'schedule',
        position: 'top-right',
        timeout: 5000,
      });
    }

    if (segundosRestantes.value <= 0) {
      cerrarSesionAhora('inactividad');
    }
  }

  function iniciar() {
    if (activo.value) return;
    resetear();
    activo.value = true;
    limpiarIntervalo();
    intervaloId = setInterval(tick, 1000);

    if (!eventosRegistrados) {
      const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      eventos.forEach((ev) => document.addEventListener(ev, leerActividad, { passive: true }));
      eventosRegistrados = true;
    }
  }

  function detener() {
    limpiarIntervalo();
    limpiarEventos();
    activo.value = false;
    resetear();
  }

  return {
    segundosRestantes,
    segundosVisibles,
    minutosRestantes,
    advertenciaActiva,
    nivelAdvertencia,
    activo,
    cerrando,
    iniciar,
    detener,
    extenderSesion,
    cerrarSesionAhora,
    resetear,
  };
}
