import { onMounted, onBeforeUnmount } from 'vue';

const UMBRAL_GAP_RAF = 2000;
const COOLDOWN_REPORTE = 5000;
const INTERVALO_FOCO = 500;

export function useAntiCopia({ obtenerRendicion, reportarEvento, alCerrarPorSalida, alDetectarSalida, estaBloqueado }) {
  let rafId = null;
  let ultimoRaf = 0;
  let intervaloFoco = null;
  let focosFalsosSeguidos = 0;
  const cooldownEventos = new Map();

  const puedeReportar = (tipo) => {
    const ahora = Date.now();
    const ultimo = cooldownEventos.get(tipo) || 0;
    if (ahora - ultimo < COOLDOWN_REPORTE) return false;
    cooldownEventos.set(tipo, ahora);
    return true;
  };

  const reportarSeguro = async (tipo, detalle) => {
    const rendicion = obtenerRendicion();
    if (!rendicion || estaBloqueado()) return;
    if (!puedeReportar(tipo)) return;
    try {
      const sufijo = detalle ? `_${detalle}` : '';
      const r = await reportarEvento(rendicion.id, `${tipo}${sufijo}`);
      if (r?.data?.rendicion_cerrada) {
        alCerrarPorSalida(r.data.motivo || tipo);
      }
    } catch (e) { /* silencioso */ }
  };

  const monitorearRaf = () => {
    const ahora = performance.now();
    if (ultimoRaf > 0 && !document.hidden) {
      const gap = ahora - ultimoRaf;
      if (gap > UMBRAL_GAP_RAF) {
        reportarSeguro('raf_gap', Math.floor(gap));
      }
    }
    ultimoRaf = ahora;
    rafId = requestAnimationFrame(monitorearRaf);
  };

  const monitorearFoco = () => {
    const rendicion = obtenerRendicion();
    if (!rendicion || estaBloqueado()) return;
    if (document.hidden) return;
    const conFoco = document.hasFocus();
    if (conFoco) {
      focosFalsosSeguidos = 0;
    } else {
      focosFalsosSeguidos += 1;
      if (focosFalsosSeguidos >= 3) {
        reportarSeguro('hasfocus_false');
        focosFalsosSeguidos = 0;
      }
    }
  };

  const alSalirFullscreen = () => {
    if (document.fullscreenElement === null) {
      reportarSeguro('fullscreen_exit');
    }
  };

  const entrarFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) { /* silencioso */ }
  };

  const bloquearCopia = (e) => {
    e.preventDefault();
    reportarSeguro('copy_attempt');
  };

  const bloquearPegado = (e) => {
    e.preventDefault();
    reportarSeguro('paste_attempt');
  };

  const bloquearContexto = (e) => {
    e.preventDefault();
    reportarSeguro('context_menu');
  };

  const alSalirMouse = () => {
    reportarSeguro('mouse_leave');
  };

  const alCambiarVisibilidad = async () => {
    const rendicion = obtenerRendicion();
    if (!rendicion || estaBloqueado()) return;

    if (document.hidden) {
      try {
        const r = await reportarEvento(rendicion.id, 'salida_pagina');
        if (r?.data?.rendicion_cerrada) {
          alCerrarPorSalida(r.data.motivo || 'salida_pagina');
          return;
        }
        if (alDetectarSalida) {
          await alDetectarSalida();
        }
      } catch (e) { /* silencioso */ }
    } else {
      try {
        await reportarEvento(rendicion.id, 'vuelta_pagina');
      } catch (e) { /* silencioso */ }
    }
  };

  const alIntentarSalir = (e) => {
    if (estaBloqueado()) return;
    e.preventDefault();
    e.returnValue = '';
  };

  function activar() {
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    document.addEventListener('copy', bloquearCopia);
    document.addEventListener('cut', bloquearCopia);
    document.addEventListener('paste', bloquearPegado);
    document.addEventListener('contextmenu', bloquearContexto);
    document.addEventListener('fullscreenchange', alSalirFullscreen);
    document.documentElement.addEventListener('mouseleave', alSalirMouse);
    rafId = requestAnimationFrame(monitorearRaf);
    intervaloFoco = setInterval(monitorearFoco, INTERVALO_FOCO);
    entrarFullscreen();
    window.addEventListener('beforeunload', alIntentarSalir);
  }

  function desactivar() {
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    document.removeEventListener('copy', bloquearCopia);
    document.removeEventListener('cut', bloquearCopia);
    document.removeEventListener('paste', bloquearPegado);
    document.removeEventListener('contextmenu', bloquearContexto);
    document.removeEventListener('fullscreenchange', alSalirFullscreen);
    document.documentElement.removeEventListener('mouseleave', alSalirMouse);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (intervaloFoco !== null) {
      clearInterval(intervaloFoco);
      intervaloFoco = null;
    }
    window.removeEventListener('beforeunload', alIntentarSalir);
  }

  onBeforeUnmount(() => { desactivar(); });

  return {
    activar,
    desactivar,
    entrarFullscreen,
    reportarSeguro,
  };
}
