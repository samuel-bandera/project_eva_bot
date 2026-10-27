import { z } from 'zod';
import * as ticketModel from '../../models/comm/ticket_model.js';
import { pool } from '../../config/db.js';
import { ok, creado, noEncontrado, prohibido, error } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  destinatario: z.enum(['docente', 'admin']),
  profesorId:   z.coerce.number().int().positive().optional().nullable(),
  materiaId:    z.coerce.number().int().positive().optional().nullable(),
  asunto:       z.string().min(5, 'Mínimo 5 caracteres').max(200, 'Máximo 200 caracteres'),
  descripcion:  z.string().min(10, 'Mínimo 10 caracteres').max(5000, 'Máximo 5000 caracteres'),
  prioridad:    z.enum(['baja', 'media', 'alta']).optional().default('media'),
});

const esquemaResponder = z.object({
  mensaje: z.string().min(1, 'Mensaje requerido').max(5000, 'Máximo 5000 caracteres'),
});

const esquemaEstado = z.object({
  estado: z.enum(['abierto', 'en_proceso', 'resuelto', 'cerrado']),
});

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);

  if (datos.destinatario === 'docente' && !datos.profesorId) {
    return error(res, 422, 'Debés indicar el profesor destinatario');
  }
  if (datos.destinatario === 'admin') {
    datos.profesorId = null;
  }

  const id = await ticketModel.crear(null, {
    alumnoId: req.usuario.id,
    destinatario: datos.destinatario,
    profesorId: datos.profesorId,
    materiaId: datos.materiaId,
    asunto: datos.asunto,
    descripcion: datos.descripcion,
    prioridad: datos.prioridad,
  });

  const ticket = await ticketModel.obtenerPorId(id);
  return creado(res, ticket, 'Ticket creado exitosamente');
}

export async function listarMios(req, res) {
  const tickets = await ticketModel.listarDeAlumno(req.usuario.id);
  return ok(res, tickets);
}

export async function listarParaMi(req, res) {
  let tickets = [];
  if (req.usuario.tipo === 'docente') {
    tickets = await ticketModel.listarParaProfesor(req.usuario.id);
  } else if (['admin', 'coordinador'].includes(req.usuario.tipo)) {
    tickets = await ticketModel.listarTodos({ estado: req.query.estado });
  } else {
    return prohibido(res, 'Sin permisos');
  }
  return ok(res, tickets);
}

export async function listarTodos(req, res) {
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return prohibido(res, 'Solo admin o coordinador');
  }
  const tickets = await ticketModel.listarTodos({ estado: req.query.estado });
  return ok(res, tickets);
}

export async function obtener(req, res) {
  const id = Number(req.params.id);
  const ticket = await ticketModel.obtenerPorId(id);
  if (!ticket) return noEncontrado(res, 'Ticket no encontrado');

  const esAlumno = req.usuario.tipo === 'alumno' && ticket.alumno_id === req.usuario.id;
  const esProfesor = req.usuario.tipo === 'docente' && ticket.docente_id === req.usuario.id;
  const esAdmin = ['admin', 'coordinador'].includes(req.usuario.tipo);

  if (!esAlumno && !esProfesor && !esAdmin) {
    return prohibido(res, 'Sin permisos para ver este ticket');
  }

  const respuestas = await ticketModel.listarRespuestas(id);
  return ok(res, { ticket, respuestas });
}

export async function responder(req, res) {
  const id = Number(req.params.id);
  const { mensaje } = esquemaResponder.parse(req.body);

  const ticket = await ticketModel.obtenerPorId(id);
  if (!ticket) return noEncontrado(res, 'Ticket no encontrado');

  const esAlumno = req.usuario.tipo === 'alumno' && ticket.alumno_id === req.usuario.id;
  const esProfesor = req.usuario.tipo === 'docente' && ticket.docente_id === req.usuario.id;
  const esAdmin = ['admin', 'coordinador'].includes(req.usuario.tipo);

  if (!esAlumno && !esProfesor && !esAdmin) {
    return prohibido(res, 'Sin permisos');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await ticketModel.agregarRespuesta(conn, {
      ticketId: id,
      autorId: req.usuario.id,
      autorTipo: req.usuario.tipo,
      mensaje,
    });


    let nuevoEstado = ticket.estado;
    if (ticket.estado === 'abierto' && (esProfesor || esAdmin)) {
      nuevoEstado = 'en_proceso';
    }
    if (nuevoEstado !== ticket.estado) {
      await ticketModel.cambiarEstado(conn, id, nuevoEstado);
    }

    await conn.commit();

    const respuestas = await ticketModel.listarRespuestas(id);
    return ok(res, respuestas, 'Respuesta agregada');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function cambiarEstado(req, res) {
  const id = Number(req.params.id);
  const { estado } = esquemaEstado.parse(req.body);

  if (!['docente', 'admin', 'coordinador'].includes(req.usuario.tipo)) {
    return prohibido(res, 'Sin permisos');
  }

  const ticket = await ticketModel.obtenerPorId(id);
  if (!ticket) return noEncontrado(res, 'Ticket no encontrado');

  if (req.usuario.tipo === 'docente' && ticket.docente_id !== req.usuario.id) {
    return prohibido(res, 'No sos el destinatario de este ticket');
  }

  await ticketModel.cambiarEstado(null, id, estado);
  return ok(res, { estado }, 'Estado actualizado');
}

export async function estadisticas(req, res) {
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return prohibido(res, 'Solo admin o coordinador');
  }
  const stats = await ticketModel.contarPorEstado();
  return ok(res, stats);
}

export async function profesoresDisponibles(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.nombre, u.apellido, u.usuario,
            GROUP_CONCAT(DISTINCT m.nombre SEPARATOR ', ') AS materias
     FROM usuarios u
     LEFT JOIN materias_docente mp ON mp.docente_id = u.id
     LEFT JOIN materias m ON m.id = mp.materia_id
     WHERE u.tipo = 'docente' AND u.activo = 1 AND u.estado = 'aprobado'
     GROUP BY u.id
     ORDER BY u.apellido`
  );
  return ok(res, rows);
}
