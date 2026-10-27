import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Notify } from 'quasar';
import * as examenApi from '../api/examen.api.js';
import * as evalApi from '../api/evaluacion.api.js';
import { useTemporizadorExamen } from './useTemporizadorExamen.js';
import { useAntiCopia } from './useAntiCopia.js';

export function useExamen(evaluacionId) {
  const cargando = ref(true);
  const error = ref('');
  const examen = ref(null);
  const rendicion = ref(null);
  const preguntas = ref([]);
  const respuestas = ref({});
  const indiceActual = ref(0);
  const guardando = ref(false);
  const ultimoGuardado = ref(null);
  const enviando = ref(false);
  const enviado = ref(false);
  const rendicionBloqueada = ref(false);
  const motivoBloqueo = ref('');
  const tiempoExtra = ref(0);

  const mostrarOverlayAntiCopia = ref(false);
  const notaActual = ref(null);
  let pollingAutorizacion = null;

  const modalApertura = ref(true);
  const pasoModal = ref('compromiso');
  const aceptoResponsabilidad = ref(false);
  const solicitarPantallaCompleta = ref(false);

  const mostrarPuntaje = ref(false);
  const datosPuntaje = ref(null);
  const mostrarRevision = ref(false);
  const datosRevision = ref(null);

  let heartbeatTimer = null;
  let saveTimer = null;

  const totalPreguntas = computed(() => preguntas.value.length);
  const preguntaActual = computed(() => preguntas.value[indiceActual.value] || null);
  const totalRespondidas = computed(() =>
    preguntas.value.filter((p) => {
      const v = respuestas.value[p.id];
      return v && String(v).trim().length > 0;
    }).length
  );
  const porcentajeAvance = computed(() =>
    totalPreguntas.value ? Math.round((totalRespondidas.value / totalPreguntas.value) * 100) : 0
  );

  const { segundosRestantes, iniciar: iniciarTemporizador, detener: detenerTemporizador } = useTemporizadorExamen((forzar) => {
    if (!enviado.value) {
      finalizarExamen(forzar);
    }
  });

  const tiempoFormateado = computed(() => {
    const t = Math.max(0, segundosRestantes.value);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  });
  const tiempoUrgente = computed(() => segundosRestantes.value < 300 && segundosRestantes.value > 0);
  const tiempoCritico = computed(() => segundosRestantes.value < 60 && segundosRestantes.value > 0);
  const colorTimer = computed(() => {
    if (tiempoCritico.value) return 'negative';
    if (tiempoUrgente.value) return 'warning';
    return 'primary';
  });

  const estaBloqueado = () => enviado.value || rendicionBloqueada.value;

  const antiCopia = useAntiCopia({
    obtenerRendicion: () => rendicion.value,
    reportarEvento: (id, tipo) => examenApi.reportarEvento(id, tipo),
    alCerrarPorSalida: (motivo) => {
      rendicionBloqueada.value = true;
      motivoBloqueo.value = motivo;
      pararTimers();
      antiCopia.desactivar();
    },
    alDetectarSalida: async () => {
      if (examen.value?.modo_examen_seguro) {
        await notificarSalidaDetectada();
      }
    },
    estaBloqueado,
  });

  function letraOpcion(i) {
    return ['A', 'B', 'C', 'D', 'E', 'F'][i] || String(i + 1);
  }

  function seleccionarOpcion(texto) {
    if (!preguntaActual.value) return;
    respuestas.value[preguntaActual.value.id] = texto;
    debounceGuardar();
  }

  function marcarVerdaderoFalso(valor) {
    if (!preguntaActual.value) return;
    respuestas.value[preguntaActual.value.id] = valor;
    debounceGuardar();
  }

  async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
      examen.value = await evalApi.obtenerEvaluacion(evaluacionId);
      if (!examen.value) throw new Error('Evaluación no encontrada');
      preguntas.value = examen.value.preguntas || [];

      const inicio = await examenApi.iniciarExamen(evaluacionId);
      const rendicionId = inicio.rendicionId || inicio.rendicion?.id;
      if (!rendicionId) throw new Error('No se pudo iniciar la rendición');

      rendicion.value = {
        id: rendicionId,
        ...(inicio.rendicion || {}),
      };

      if (rendicion.value.estado === 'enviada' || rendicion.value.estado === 'corregida') {
        rendicionBloqueada.value = true;
        motivoBloqueo.value = rendicion.value.motivo_cierre || 'ya_enviada';
        pararTimers();
        return;
      }

      if (Array.isArray(inicio.respuestas)) {
        for (const r of inicio.respuestas) {
          respuestas.value[r.evaluacion_pregunta_id] = r.respuesta || '';
        }
      }

      const hb = await examenApi.heartbeat(rendicionId, 0);
      segundosRestantes.value = hb.segundos_restantes ?? (examen.value.duracion_minutos * 60);
      tiempoExtra.value = hb.tiempo_extra_segundos || 0;

      iniciarTimers(rendicionId);
      antiCopia.activar();

      const yaAcepto = sessionStorage.getItem(`evalbot_resp_${evaluacionId}`);
      if (yaAcepto) {
        modalApertura.value = false;
      } else if (examen.value?.instrucciones && examen.value?.mostrar_instrucciones) {
        pasoModal.value = 'instrucciones';
      } else {
        pasoModal.value = 'compromiso';
      }
    } catch (e) {
      console.error(e);
      error.value = e.response?.data?.error || e.message || 'No se pudo iniciar el examen';
    } finally {
      cargando.value = false;
    }
  }

  function iniciarTimers(rendicionId) {
    iniciarTemporizador(segundosRestantes.value);

    heartbeatTimer = setInterval(async () => {
      try {
        const hb = await examenApi.heartbeat(rendicionId, indiceActual.value);
        if (typeof hb.segundos_restantes === 'number') {
          segundosRestantes.value = hb.segundos_restantes;
        }
        tiempoExtra.value = hb.tiempo_extra_segundos || 0;
      } catch (e) {
        console.warn('Heartbeat falló:', e.message);
      }
    }, 15000);
  }

  async function guardarActual() {
    if (!preguntaActual.value || !rendicion.value) return;
    const texto = String(respuestas.value[preguntaActual.value.id] || '').trim();
    if (!texto) return;

    guardando.value = true;
    try {
      await examenApi.guardarRespuesta(rendicion.value.id, preguntaActual.value.id, texto);
      ultimoGuardado.value = new Date();
    } catch (e) {
      console.warn('No se pudo guardar:', e.message);
    } finally {
      guardando.value = false;
    }
  }

  function debounceGuardar() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(guardarActual, 700);
  }

  function actualizarRespuesta(texto) {
    if (!preguntaActual.value) return;
    respuestas.value[preguntaActual.value.id] = texto;
    debounceGuardar();
  }

  async function irA(indice) {
    if (indice < 0 || indice >= totalPreguntas.value) return;
    await guardarActual();
    indiceActual.value = indice;
    try {
      await examenApi.reportarEvento(rendicion.value.id, 'cambio_pregunta', {
        preguntaActual: indice,
      });
    } catch (e) { /* silencioso */ }
  }

  async function anterior() { await irA(indiceActual.value - 1); }
  async function siguiente() { await irA(indiceActual.value + 1); }

  async function finalizarExamen(automatico = false) {
    if (enviado.value || !rendicion.value || rendicionBloqueada.value) return;

    if (!automatico) {
      const { Dialog } = await import('quasar');
      const confirmado = await new Promise((resolve) => {
        Dialog.create({
          title: 'Enviar examen',
          message: `¿Estás seguro? Respondidas ${totalRespondidas.value} de ${totalPreguntas.value} preguntas.`,
          cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
          ok: { label: 'Enviar', color: 'primary', unelevated: true },
          persistent: true,
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false));
      });
      if (!confirmado) return;
    }

    enviando.value = true;
    try {
      await guardarActual();
      await examenApi.enviarExamen(rendicion.value.id);
      enviado.value = true;
      pararTimers();
      antiCopia.desactivar();
      const respuesta = await examenApi.verMiRendicion(rendicion.value.id);
      const r = respuesta?.rendicion || {};
      datosPuntaje.value = {
        nota: Number(r.nota) || 0,
        notaMaxima: Number(examen.value?.nota_maxima) || 10,
        totalRespondidas: totalRespondidas.value,
        totalPreguntas: totalPreguntas.value,
      };
      mostrarPuntaje.value = true;
      detenerPollingAutorizacion();
    } catch (e) {
      Notify.create({
        type: 'negative',
        message: e.response?.data?.error || 'No se pudo enviar el examen',
        position: 'top',
      });
    } finally {
      enviando.value = false;
    }
  }

  function pararTimers() {
    clearInterval(heartbeatTimer);
    detenerTemporizador();
    clearTimeout(saveTimer);
  }

  async function iniciarExamenDesdeModal() {
    if (!aceptoResponsabilidad.value) return;

    if (solicitarPantallaCompleta.value) {
      try {
        const el = document.documentElement;
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (fn) {
          await Promise.race([
            fn.call(el),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
          ]);
        } else {
          throw new Error('API no disponible');
        }
      } catch (e) {
        Notify.create({
          type: 'info',
          message: 'Continuando sin pantalla completa',
          caption: 'El navegador no la permite, pero podés rendir igual.',
          position: 'top',
          timeout: 3500,
        });
      }
    }

    sessionStorage.setItem(`evalbot_resp_${evaluacionId}`, '1');
    modalApertura.value = false;
  }

  function continuarACompromiso() {
    pasoModal.value = 'compromiso';
  }

  async function verMisRespuestas() {
    if (!rendicion.value) return;
    datosRevision.value = null;
    mostrarRevision.value = true;
    try {
      datosRevision.value = await examenApi.verMiRendicion(rendicion.value.id);
    } catch (e) {
      Notify.create({ type: 'negative', message: 'No se pudieron cargar tus respuestas', position: 'top' });
    }
  }

  async function notificarSalidaDetectada() {
    try {
      const data = await examenApi.verMiRendicion(rendicion.value.id);
      const r = data?.rendicion;
      if (r) {
        notaActual.value = r.nota != null ? Number(r.nota) : null;
      }
    } catch (e) { /* silencioso */ }
    mostrarOverlayAntiCopia.value = true;
    iniciarPollingAutorizacion();
  }

  function iniciarPollingAutorizacion() {
    detenerPollingAutorizacion();
    if (!rendicion.value) return;
    pollingAutorizacion = setInterval(async () => {
      try {
        const data = await examenApi.verMiRendicion(rendicion.value.id);
        const r = data?.rendicion;
        if (!r) return;

        if (!r.pendiente_autorizacion) {
          mostrarOverlayAntiCopia.value = false;
          detenerPollingAutorizacion();
          Notify.create({ type: 'positive', message: 'El docente te autorizó a continuar', position: 'top' });
          return;
        }

        if (r.estado === 'enviada' || r.estado === 'corregida') {
          detenerPollingAutorizacion();
          rendicionBloqueada.value = true;
          motivoBloqueo.value = r.motivo_cierre || 'cierre_docente';
          mostrarOverlayAntiCopia.value = false;
          if (r.nota != null) {
            datosPuntaje.value = {
              nota: Number(r.nota),
              notaMaxima: Number(examen.value?.nota_maxima) || 10,
              totalRespondidas: totalRespondidas.value,
              totalPreguntas: totalPreguntas.value,
            };
            mostrarPuntaje.value = true;
          }
        }
      } catch (e) { /* silencioso */ }
    }, 5000);
  }

  function detenerPollingAutorizacion() {
    if (pollingAutorizacion) {
      clearInterval(pollingAutorizacion);
      pollingAutorizacion = null;
    }
  }

  onMounted(() => { cargar(); });
  onBeforeUnmount(() => {
    detenerPollingAutorizacion();
    pararTimers();
    antiCopia.desactivar();
  });

  return {
    cargando, error, examen, rendicion, preguntas, respuestas, indiceActual,
    guardando, ultimoGuardado, enviando, enviado, rendicionBloqueada, motivoBloqueo,
    tiempoExtra, mostrarOverlayAntiCopia, notaActual,
    modalApertura, pasoModal, aceptoResponsabilidad, solicitarPantallaCompleta,
    mostrarPuntaje, datosPuntaje, mostrarRevision, datosRevision,
    segundosRestantes, tiempoFormateado, tiempoUrgente, tiempoCritico, colorTimer,
    totalPreguntas, preguntaActual, totalRespondidas, porcentajeAvance,
    letraOpcion, seleccionarOpcion, marcarVerdaderoFalso, actualizarRespuesta,
    irA, anterior, siguiente, finalizarExamen,
    iniciarExamenDesdeModal, continuarACompromiso, verMisRespuestas,
    reportarSeguro: antiCopia.reportarSeguro,
  };
}
