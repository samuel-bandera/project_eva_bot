
import { z } from 'zod';
import * as tareaModel from '../../models/acad/tarea_model.js';
import { ok, creado, noEncontrado, error } from '../../utils/respuestas.js';
import * as auditoria from '../../utils/auditoria.js';

const esquemaCrear = z.object({
  titulo:        z.string().min(3).max(150),
  descripcion:   z.string().optional().nullable(),
  materiaId:     z.coerce.number().int().positive().optional().nullable(),
  fechaEntrega:  z.string().datetime(),
  fechaCierre:   z.string().datetime().optional().nullable(),
  estado:        z.enum(['borrador', 'publicada', 'cerrada']).default('borrador'),
  ponderacion:   z.coerce.number().nonnegative().default(1),
  color:         z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

const esquemaActualizar = esquemaCrear.partial();

export async function listarDeMateria(req, res) {
  const { materiaId } = req.params;
  const { estado } = req.query;
  const tareas = await tareaModel.listarTareasDeMateria(Number(materiaId), { estado: estado || null });
  return ok(res, tareas);
}

export async function listarDeAlumno(req, res) {
  const tareas = await tareaModel.listarTareasDeAlumno(req.usuario.id);
  return ok(res, tareas);
}

export async function listarDeProfesor(req, res) {
  const tareas = await tareaModel.listarTareasDeProfesor(req.usuario.id);
  return ok(res, tareas);
}

export async function obtener(req, res) {
  const { id } = req.params;
  const tarea = await tareaModel.obtenerTarea(Number(id));
  if (!tarea) return noEncontrado(res, 'Tarea no encontrada');
  return ok(res, tarea);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);

  const id = await tareaModel.crearTarea(null, {
    ...datos,
    asignadaPor: req.usuario.id
  });

  return creado(res, { id }, 'Tarea creada');
}

export async function cambiarEstado(req, res) {
  const { id } = req.params;
  const { estado } = z.object({
    estado: z.enum(['borrador', 'publicada', 'cerrada'])
  }).parse(req.body);

  const tarea = await tareaModel.obtenerTarea(Number(id));
  if (!tarea) return noEncontrado(res, 'Tarea no encontrada');
  if (tarea.asignada_por !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return error(res, 403, 'No sos el autor de la tarea');
  }

  await tareaModel.actualizarEstadoTarea(null, Number(id), estado);
  return ok(res, null, `Estado cambiado a ${estado}`);
}

export async function eliminar(req, res) {
  const { id } = req.params;

  const tarea = await tareaModel.obtenerTarea(Number(id));
  if (!tarea) return noEncontrado(res, 'Tarea no encontrada');
  if (tarea.asignada_por !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return error(res, 403, 'No sos el autor de la tarea');
  }

  auditoria.registrarEliminacion(req, 'tareas', Number(id), tarea.titulo);
  await tareaModel.eliminarTarea(null, Number(id));
  return ok(res, null, 'Tarea eliminada');
}

