import { ref, watch } from 'vue';
import http from '../api/http.js';

const CACHE_KEY = 'evalbot_prefs_cache';

const DEFAULT_PREFS = {
  densidad: 'normal',
  tamano_fuente: 'normal',
  color_acento: 'vino',
  reduce_motion: false,
  alto_contraste: false,
  modo_lectura: false,

  notif_tareas: true,
  notif_evaluaciones: true,
  notif_notas: true,
  notif_foros: false,
  notif_comunicados: true,
  notif_email: true,
  notif_sonidos: false,

  no_molestar_activo: false,
  no_molestar_desde: '22:00',
  no_molestar_hasta: '08:00',
  no_molestar_fines_semana: true,

  resumen_semanal: true,
  resumen_dia: 'lunes',

  recordatorio_tareas: '3d',
  ocultar_notas_publicacion: false,

  notif_entregas_pendientes: true,
  notif_correcciones_pendientes: true,
  notif_tickets_recibidos: true,
  notif_mensajes_alumnos: true,
  copia_email_evaluacion: false,

  notif_cuentas_pendientes: true,
  notif_matriculas_pendientes: true,
  notif_reportes_seguridad: true,
  notif_alumnos_riesgo: true,
  alumnos_riesgo_umbral: 70,

  notif_alertas_criticas: true,
  notif_errores_sistema: true,
  notif_accesos_sospechosos: true,
  notif_rate_limit: true,

  perfil_visible: true,
  mostrar_email: false,
};

const prefs = ref({ ...DEFAULT_PREFS });
const cargando = ref(false);
const cargado = ref(false);

try {
  const cache = localStorage.getItem(CACHE_KEY);
  if (cache) prefs.value = { ...DEFAULT_PREFS, ...JSON.parse(cache) };
} catch (e) {}

function aplicarAlHTML(p) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-density', p.densidad || 'normal');
  root.setAttribute('data-tamano-fuente', p.tamano_fuente || 'normal');
  root.setAttribute('data-accent', p.color_acento || 'vino');
  root.setAttribute('data-contraste', p.alto_contraste ? 'alto' : 'normal');
  root.setAttribute('data-modo-lectura', p.modo_lectura ? 'true' : 'false');
  root.setAttribute('data-reduce-motion', p.reduce_motion ? 'true' : 'false');
}

aplicarAlHTML(prefs.value);

watch(prefs, (nuevo) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(nuevo));
  aplicarAlHTML(nuevo);
}, { deep: true });

export function usePreferences() {
  async function cargarDelBackend() {
    if (!localStorage.getItem('evalbot_token')) return;
    cargando.value = true;
    try {
      const { data } = await http.get('/usuarios/preferencias');
      if (data?.data && Object.keys(data.data).length > 0) {
        prefs.value = { ...DEFAULT_PREFS, ...data.data };
      }
      cargado.value = true;
    } catch (e) {}
    finally { cargando.value = false; }
  }

  async function guardar(nuevasPrefs = prefs.value) {
    prefs.value = { ...prefs.value, ...nuevasPrefs };
    try {
      await http.patch('/usuarios/preferencias', { preferencias: prefs.value });
      return true;
    } catch (e) { return false; }
  }

  function estaEnNoMolestar() {
    if (!prefs.value.no_molestar_activo) return false;
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const [desdeH, desdeM] = (prefs.value.no_molestar_desde || '22:00').split(':').map(Number);
    const [hastaH, hastaM] = (prefs.value.no_molestar_hasta || '08:00').split(':').map(Number);
    const desde = desdeH * 60 + desdeM;
    const hasta = hastaH * 60 + hastaM;

    if (desde > hasta) {
      if (horaActual >= desde || horaActual < hasta) return true;
    } else {
      if (horaActual >= desde && horaActual < hasta) return true;
    }

    if (prefs.value.no_molestar_fines_semana) {
      const dia = ahora.getDay();
      if (dia === 0 || dia === 6) return true;
    }

    return false;
  }

  function set(key, value) {
    prefs.value = { ...prefs.value, [key]: value };
  }

  async function resetear() {
    prefs.value = { ...DEFAULT_PREFS };
    return guardar();
  }

  return { prefs, cargando, cargado, cargarDelBackend, guardar, set, resetear, estaEnNoMolestar };
}
