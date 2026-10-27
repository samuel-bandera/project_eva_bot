import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaRespuesta = z.object({
  evaluacionPreguntaId: z.coerce.number().int().positive(),
  respuesta:            z.string().max(5000)
});

export async function iniciar(req, res) {
  const { id } = req.params;
  const evaluacionId = Number(id);
  const alumnoId = req.usuario.id;

  const ev = await evalModel.obtenerEvaluacion(evaluacionId);
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.estado !== 'publicada' && ev.estado !== 'abierta') {
    return error(res, 409, 'La evaluación no está abierta');
  }

  const [[ventana]] = await pool.query(
    `SELECT NOW() < fecha_apertura AS aun_no,
            NOW() > fecha_cierre   AS ya_cerro
     FROM evaluaciones WHERE id = ?`,
    [evaluacionId]
  );
  if (ventana?.aun_no)  return error(res, 409, 'Aún no comienza');
  if (ventana?.ya_cerro) return error(res, 409, 'Ya cerró');

  const enProgreso = await evalModel.obtenerRendicionEnProgreso(evaluacionId, alumnoId);
  if (enProgreso) {
    const respuestas = await evalModel.listarRespuestasDeRendicion(enProgreso.id);
    return ok(res, { rendicion: enProgreso, rendicionId: enProgreso.id, respuestas });
  }

  const [completadas] = await pool.query(
    `SELECT COUNT(*) AS total,
            MAX(CASE WHEN estado = 'corregida' THEN 1 ELSE 0 END) AS alguna_corregida
     FROM rendiciones
     WHERE evaluacion_id = ? AND alumno_id = ?`,
    [evaluacionId, alumnoId]
  );
  const totalIntentos = Number(completadas[0].total) || 0;
  const intentosPermitidos = Number(ev.intentos_permitidos) || 1;

  if (totalIntentos >= intentosPermitidos) {
    return error(res, 409, `Ya usaste todos los intentos (${totalIntentos}/${intentosPermitidos}). Contactá al docente.`);
  }

  const rendicionId = await evalModel.crearRendicion(null, { evaluacionId, alumnoId });

  return creado(res, { rendicionId }, `Rendición iniciada (intento ${totalIntentos + 1}/${intentosPermitidos})`);
}

export async function responder(req, res) {
  const { rendicionId } = req.params;
  const datos = esquemaRespuesta.parse(req.body);

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');
  if (rendicion.estado !== 'en_progreso') {
    return error(res, 409, 'La rendición ya fue enviada');
  }

  await evalModel.guardarRespuesta(null, {
    rendicionId: Number(rendicionId),
    evaluacionId: rendicion.evaluacion_id,
    evaluacionPreguntaId: datos.evaluacionPreguntaId,
    respuesta: datos.respuesta
  });

  return ok(res, null, 'Respuesta guardada');
}

export async function enviar(req, res) {
  const { rendicionId } = req.params;

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');
  if (rendicion.estado !== 'en_progreso') {
    return error(res, 409, 'La rendición ya fue enviada');
  }

  await evalModel.enviarRendicion(null, Number(rendicionId));
  const resultado = await evalModel.calcularNotaAutomatica(Number(rendicionId));

  return ok(res, resultado, 'Rendición enviada y corregida');
}

export async function listarRendiciones(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }

  const rendiciones = await evalModel.listarRendicionesDeEvaluacion(Number(id));
  return ok(res, rendiciones);
}

export async function verMiRendicion(req, res) {
  const { rendicionId } = req.params;

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');

  const respuestas = await evalModel.listarRespuestasDeRendicion(Number(rendicionId));
  return ok(res, { rendicion, respuestas });
}

export async function autorizarContinuidad(req, res) {
  const { rendicionId } = req.params;
  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');

  const evaluacion = await evalModel.obtenerEvaluacion(rendicion.evaluacion_id);
  if (evaluacion.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el docente de esta evaluación');
  }

  await evalModel.autorizarRendicion(Number(rendicionId));
  return ok(res, { mensaje: 'Alumno autorizado a continuar' });
}

export async function listarPendientesAutorizacion(req, res) {
  const datos = await evalModel.listarRendicionesPendientesAutorizacion(req.usuario.id);
  return ok(res, datos);
}

