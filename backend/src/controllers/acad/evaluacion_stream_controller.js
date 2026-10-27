import * as evalModel from '../../models/acad/evaluacion_model.js';
import { ok, noEncontrado, prohibido } from '../../utils/respuestas.js';

export async function progresoEnVivo(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }

  const estados = await evalModel.estadoEnVivo(Number(id));

  const resumen = {
    total_alumnos: estados.length,
    en_curso: estados.filter(e => e.estado === 'en_progreso').length,
    enviados: estados.filter(e => e.estado === 'enviada').length,
    corregidos: estados.filter(e => e.estado === 'corregida').length,
    salidas_detectadas: estados.filter(e => e.salidas_detectadas > 0).length,
    inactivos: estados.filter(e =>
      e.estado === 'en_progreso' &&
      e.segundos_inactivo !== null &&
      e.segundos_inactivo > 60
    ).length
  };

  return ok(res, { evaluacion: ev, alumnos: estados, resumen });
}

export async function historialEventos(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }

  const eventos = await evalModel.listarEventosEnVivo(Number(id), { limit: 200 });
  return ok(res, eventos);
}

export async function streamProgreso(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const enviarActualizacion = async () => {
    try {
      const estados = await evalModel.estadoEnVivo(Number(id));
      const resumen = {
        total: estados.length,
        en_curso: estados.filter(e => e.estado === 'en_progreso').length,
        inactivos: estados.filter(e =>
          e.estado === 'en_progreso' &&
          e.segundos_inactivo !== null &&
          e.segundos_inactivo > 60
        ).length,
        salidas: estados.filter(e => e.salidas_detectadas > 0).length
      };

      res.write(`event: progreso\n`);
      res.write(`data: ${JSON.stringify({ alumnos: estados, resumen, ts: Date.now() })}\n\n`);
    } catch (err) {
      console.error('Error en streamProgreso:', err.message);
    }
  };

  await enviarActualizacion();

  const interval = setInterval(enviarActualizacion, 3000);

  const heartbeat = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  });
}

