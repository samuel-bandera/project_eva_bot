import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import * as notificacionModel from '../../models/comm/notificacion_model.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaCorregir = z.object({
  nota: z.preprocess(
    (val) => {
      if (typeof val === 'boolean') return NaN;
      if (typeof val === 'string') {
        const t = val.trim();
        if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
        return Number(t);
      }
      return val;
    },
    z.number({ invalid_type_error: 'Nota debe ser número' })
      .finite('Nota debe ser finita')
      .min(0, 'Nota no puede ser negativa')
      .max(100, 'Nota máxima 100')
  ),
  motivoRechazo: z.string().max(500).nullable().optional()
});

const esquemaResolverReclamo = z.object({
  estado:     z.enum(['resuelto', 'rechazado', 'en_revision']),
  resolucion: z.string().min(3).max(2000),
  notaFinal:  z.coerce.number().nonnegative().optional().nullable()
});

export async function verRespuestasDeRendicion(req, res) {
  const { rendicionId } = req.params;

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');

  const respuestas = await evalModel.listarRespuestasDeRendicion(Number(rendicionId));
  return ok(res, { rendicion, respuestas });
}

export async function corregir(req, res) {
  const { rendicionId } = req.params;
  const datos = esquemaCorregir.parse(req.body);

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');

  if (datos.nota > rendicion.nota_maxima) {
    return error(res, 422, `La nota no puede superar ${rendicion.nota_maxima}`);
  }

  await evalModel.corregirRendicion(null, {
    rendicionId: Number(rendicionId),
    nota: datos.nota,
    motivoRechazo: datos.motivoRechazo
  });

  if (rendicion && rendicion.alumno_id) {
    await notificacionModel.crearNotificacion(null, {
      usuarioId: rendicion.alumno_id,
      titulo: 'Evaluación corregida',
      mensaje: `Tu evaluación fue corregida. Nota: ${datos.nota}`,
      tipo: 'info',
      url: '/alumno/evaluaciones'
    }).catch(err => console.error('Error al notificar:', err));
  }

  return ok(res, null, 'Rendición corregida');
}

export async function crearReclamo(req, res) {
  const { rendicionId, descripcion } = req.body || {};
  if (!rendicionId || !descripcion) {
    return error(res, 400, 'Faltan rendicionId o descripcion');
  }

  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id) return prohibido(res, 'No es tu rendición');

  const [ev] = await pool.query(
    'SELECT materia_id FROM evaluaciones WHERE id = ?',
    [rendicion.evaluacion_id]
  );
  if (!ev.length) return noEncontrado(res, 'Evaluación no encontrada');

  const [result] = await pool.query(
    `INSERT INTO reclamos_calificaciones
      (alumno_id, evaluacion_alumno_id, materia_id, tipo_reclamo, nota_cuestionada, motivo, estado)
     VALUES (?, ?, ?, 'evaluacion', 0, ?, 'pendiente')`,
    [req.usuario.id, rendicion.id, ev[0].materia_id, descripcion]
  );

  return creado(res, { id: result.insertId }, 'Reclamo enviado');
}

export async function listarReclamosDeRendicion(req, res) {
  const { rendicionId } = req.params;
  const rendicion = await evalModel.obtenerRendicion(Number(rendicionId));
  if (!rendicion) return noEncontrado(res, 'Rendición no encontrada');
  if (rendicion.alumno_id !== req.usuario.id && req.usuario.tipo === 'alumno') {
    return prohibido(res, 'No es tu rendición');
  }

  const [rows] = await pool.query(
    `SELECT id, evaluacion_alumno_id, tarea_id, materia_id,
            tipo_reclamo, nota_cuestionada, motivo, estado,
            resolucion, revisor_id, nota_final,
            fecha_reclamo, fecha_resolucion
     FROM reclamos_calificaciones
     WHERE evaluacion_alumno_id = ?
     ORDER BY fecha_reclamo DESC`,
    [rendicionId]
  );
  return ok(res, rows);
}

export async function listarMisReclamos(req, res) {
  const reclamos = await evalModel.listarReclamosDeAlumno(req.usuario.id);
  return ok(res, reclamos);
}

export async function listarReclamosPendientes(req, res) {
  const { materiaId } = req.query;
  const reclamos = await evalModel.listarReclamosPendientes({
    materiaId: materiaId ? Number(materiaId) : null
  });
  return ok(res, reclamos);
}

export async function resolverReclamo(req, res) {
  const { id } = req.params;
  const datos = esquemaResolverReclamo.parse(req.body);

  await evalModel.resolverReclamo(null, {
    reclamoId: Number(id),
    revisorId: req.usuario.id,
    ...datos
  });

  return ok(res, null, 'Reclamo resuelto');
}

