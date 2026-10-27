import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as matriculaModel from '../../models/admin/matricula_model.js';
import * as solicitudesModel from '../../models/admin/matricula_solicitudes_model.js';
import * as materiaModel from '../../models/acad/materia_model.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaSolicitar = z.object({
  materiaId: z.coerce.number().int().positive(),
  mensaje:   z.string().max(1000).optional().nullable()
});

const esquemaResolver = z.object({
  estado:    z.enum(['aprobada', 'rechazada']),
  respuesta: z.string().max(1000).optional().nullable()
});

export async function solicitar(req, res) {
  const datos = esquemaSolicitar.parse(req.body);

  const materia = await materiaModel.obtenerMateria(datos.materiaId);
  if (!materia) return noEncontrado(res, 'Materia no encontrada');
  if (!materia.activa) return error(res, 409, 'La materia no está activa');
  if (!materia.permite_solicitudes) return error(res, 409, 'La materia no acepta solicitudes');

  const yaMatriculado = await matriculaModel.estaMatriculado(null, req.usuario.id, datos.materiaId);
  if (yaMatriculado) return error(res, 409, 'Ya estás matriculado en esta materia');

  const tienePendiente = await solicitudesModel.tieneSolicitudPendiente(null, req.usuario.id, datos.materiaId);
  if (tienePendiente) return error(res, 409, 'Ya tenés una solicitud pendiente para esta materia');

  const id = await solicitudesModel.crearSolicitud(null, {
    alumnoId: req.usuario.id,
    materiaId: datos.materiaId,
    mensaje: datos.mensaje
  });

  return creado(res, { id }, 'Solicitud enviada');
}

export async function resolverSolicitud(req, res) {
  const { id } = req.params;
  const { estado, respuesta } = esquemaResolver.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const solicitud = await solicitudesModel.obtenerSolicitudPendiente(conn, Number(id));
    if (!solicitud) {
      await conn.rollback();
      return noEncontrado(res, 'Solicitud no encontrada o ya resuelta');
    }

    if (req.usuario.tipo === 'docente') {
      const dicta = await matriculaModel.profesorDictaMateria(conn, req.usuario.id, solicitud.materia_id);
      if (!dicta) {
        await conn.rollback();
        return prohibido(res, 'No podés resolver solicitudes de materias que no dictás');
      }
    }

    await solicitudesModel.marcarSolicitudResuelta(conn, {
      id: Number(id),
      estado,
      respuesta,
      aprobadoPor: req.usuario.id
    });

    if (estado === 'aprobada') {
      await matriculaModel.crearMatricula(conn, {
        alumnoId: solicitud.alumno_id,
        materiaId: solicitud.materia_id,
        origen: 'solicitud',
        creadoPor: req.usuario.id,
        tipoCreador: req.usuario.tipo
      });

      await matriculaModel.crearNotificacion(conn, {
        usuarioId: solicitud.alumno_id,
        titulo: 'Solicitud aprobada',
        mensaje: 'Tu solicitud de matrícula fue aprobada.',
        tipo: 'exito',
        url: '/matriculas'
      });
    } else {
      await matriculaModel.crearNotificacion(conn, {
        usuarioId: solicitud.alumno_id,
        titulo: 'Solicitud rechazada',
        mensaje: respuesta || 'Tu solicitud de matrícula fue rechazada.',
        tipo: 'alerta',
        url: '/matriculas'
      });
    }

    await conn.commit();
    return ok(res, null, `Solicitud ${estado}`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
