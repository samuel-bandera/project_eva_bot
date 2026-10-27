import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import { ok, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaHeartbeat = z.object({
  preguntaActual: z.coerce.number().int().nonnegative().nullable().optional(),
});

const esquemaEvento = z.object({
  tipo: z.enum(['cambio_pregunta', 'salida_pagina', 'vuelta_pagina']),
  preguntaActual: z.coerce.number().int().nonnegative().optional().nullable(),
  detalle: z.any().optional().nullable()
});

const esquemaAgregarTiempo = z.object({
  segundos: z.coerce.number().int().positive().max(3600)
});

export async function heartbeat(req, res) {
  const { rendicionId } = req.params;
  const { preguntaActual } = esquemaHeartbeat.parse(req.body || {});

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');
  if (rendicion.estado !== 'en_progreso') {
    return error(res, 409, 'La rendición ya fue cerrada');
  }

  await evalModel.actualizarHeartbeat(null, rendicion.id, preguntaActual || null);
  await evalModel.registrarEventoEnVivo(null, {
    rendicionId: rendicion.id,
    evaluacionId: rendicion.evaluacion_id,
    alumnoId: req.usuario.id,
    tipo: 'heartbeat',
    detalle: { preguntaActual },
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  const estados = await evalModel.estadoEnVivo(rendicion.evaluacion_id);
  const estado = estados.find(r => r.rendicion_id === rendicion.id);

  return ok(res, {
    segundos_restantes: estado?.segundos_restantes ?? 0,
    tiempo_extra_segundos: estado?.tiempo_extra_segundos ?? 0
  });
}

export async function reportarEvento(req, res) {
  const { rendicionId } = req.params;
  const datos = esquemaEvento.parse(req.body);

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await evalModel.registrarEventoEnVivo(conn, {
      rendicionId: rendicion.id,
      evaluacionId: rendicion.evaluacion_id,
      alumnoId: req.usuario.id,
      tipo: datos.tipo,
      detalle: datos.detalle,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    if (datos.tipo === 'cambio_pregunta' && datos.preguntaActual !== undefined) {
      await evalModel.actualizarHeartbeat(conn, rendicion.id, datos.preguntaActual);
    }

    if (datos.tipo === 'salida_pagina' && rendicion.estado === 'en_progreso') {
      await evalModel.incrementarSalidas(conn, rendicion.id);
      const ev = await evalModel.obtenerEvaluacion(rendicion.evaluacion_id);

      if (ev.bloquear_salida) {
        await evalModel.cerrarRendicion(conn, rendicion.id, 'salida_pagina');
        await evalModel.registrarEventoEnVivo(conn, {
          rendicionId: rendicion.id,
          evaluacionId: rendicion.evaluacion_id,
          alumnoId: req.usuario.id,
          tipo: 'entrega_automatica',
          detalle: { razon: 'salida_pagina' },
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
        await conn.commit();
        return ok(res, {
          rendicion_cerrada: true,
          motivo: 'salida_pagina'
        }, 'Salida detectada: examen cerrado automáticamente');
      }

      if (ev.modo_examen_seguro) {
        await conn.commit();
        await evalModel.marcarPendienteAutorizacion(rendicion.id);
        return ok(res, {
          pendiente_autorizacion: true,
          motivo: 'salida_pagina'
        }, 'Salida detectada: esperando autorización del docente');
      }

      await conn.commit();
      return ok(res, {
        registrado: true,
        salida_detectada: true
      }, 'Salida registrada');
    }

    await conn.commit();
    return ok(res, { registrado: true }, 'Evento registrado');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function agregarTiempo(req, res) {
  const { rendicionId } = req.params;
  const { segundos } = esquemaAgregarTiempo.parse(req.body);

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');

  const ev = await evalModel.obtenerEvaluacion(rendicion.evaluacion_id);
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }
  if (!ev.permitir_extension) {
    return error(res, 409, 'La evaluación no permite extensiones de tiempo');
  }
  if (rendicion.estado !== 'en_progreso') {
    return error(res, 409, 'La rendición ya fue cerrada');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await evalModel.agregarTiempoExtra(conn, rendicion.id, segundos);
    await evalModel.registrarEventoEnVivo(conn, {
      rendicionId: rendicion.id,
      evaluacionId: rendicion.evaluacion_id,
      alumnoId: rendicion.alumno_id,
      tipo: 'tiempo_agregado',
      detalle: { segundos, profesorId: req.usuario.id },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    await conn.commit();
    return ok(res, { segundos_agregados: segundos },
      `Se agregaron ${segundos} segundos al alumno`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function forzarCierre(req, res) {
  const { rendicionId } = req.params;

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');

  const ev = await evalModel.obtenerEvaluacion(rendicion.evaluacion_id);
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }
  if (rendicion.estado !== 'en_progreso') {
    return error(res, 409, 'La rendición ya fue cerrada');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await evalModel.cerrarRendicion(conn, rendicion.id, 'cierre_docente');
    await evalModel.registrarEventoEnVivo(conn, {
      rendicionId: rendicion.id,
      evaluacionId: rendicion.evaluacion_id,
      alumnoId: rendicion.alumno_id,
      tipo: 'cierre_manual',
      detalle: { profesorId: req.usuario.id },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    await conn.commit();
    return ok(res, null, 'Rendición cerrada por el profesor');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

