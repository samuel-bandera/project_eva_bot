import { ref } from 'vue';
import { Notify } from 'quasar';
import http from '../api/http.js';

export function useReclamos() {
  const reclamosDeRendicion = ref({});
  const dialogoReclamo = ref(false);
  const reclamoActual = ref({ preguntaId: null, preguntaTexto: '', texto: '', enviando: false });

  async function cargarReclamosDeRendicion(rendicionId) {
    if (!rendicionId) return;
    try {
      const { data } = await http.get(`/evaluaciones/rendiciones/${rendicionId}/reclamos`);
      const mapa = {};
      for (const r of (data.data || [])) {
        mapa[r.evaluacion_pregunta_id] = r;
      }
      reclamosDeRendicion.value = mapa;
    } catch (e) { /* silencioso */ }
  }

  function abrirReclamo(respuesta) {
    if (!respuesta?.evaluacion_pregunta_id) return;
    const existente = reclamosDeRendicion.value[respuesta.evaluacion_pregunta_id];
    if (existente) {
      Notify.create({
        type: 'info',
        message: `Ya enviaste un reclamo (${existente.estado}).`,
        position: 'top',
      });
      return;
    }
    reclamoActual.value = {
      preguntaId: respuesta.evaluacion_pregunta_id,
      preguntaTexto: respuesta.pregunta || '',
      texto: '',
      enviando: false,
    };
    dialogoReclamo.value = true;
  }

  async function enviarReclamo(rendicionId) {
    if (!reclamoActual.value.texto.trim()) {
      Notify.create({ type: 'warning', message: 'Escribí el motivo del reclamo', position: 'top' });
      return;
    }
    reclamoActual.value.enviando = true;
    try {
      await http.post('/evaluaciones/reclamos', {
        rendicionId,
        evaluacionPreguntaId: reclamoActual.value.preguntaId,
        descripcion: reclamoActual.value.texto.trim(),
      });
      Notify.create({ type: 'positive', message: 'Reclamo enviado al docente', position: 'top' });
      dialogoReclamo.value = false;
      await cargarReclamosDeRendicion(rendicionId);
    } catch (e) {
      Notify.create({
        type: 'negative',
        message: e.response?.data?.error || 'Error al enviar reclamo',
        position: 'top',
      });
    } finally {
      reclamoActual.value.enviando = false;
    }
  }

  return {
    reclamosDeRendicion,
    dialogoReclamo,
    reclamoActual,
    cargarReclamosDeRendicion,
    abrirReclamo,
    enviarReclamo,
  };
}
