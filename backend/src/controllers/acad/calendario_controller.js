
import { z } from 'zod';
import * as calModel from '../../models/acad/calendario_model.js';
import { ok, creado, noEncontrado, prohibido, error } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  titulo:       z.string().min(3).max(150),
  descripcion:  z.string().optional().nullable(),
  tipo:         z.enum(['institucion', 'materia', 'docente', 'personal', 'grupo']).default('personal'),
  materiaId:    z.coerce.number().int().positive().optional().nullable(),
  grupoId:      z.coerce.number().int().positive().optional().nullable(),
  fechaInicio:  z.string().datetime(),
  fechaFin:     z.string().datetime().optional().nullable(),
  todoElDia:    z.boolean().default(false),
  privado:      z.boolean().default(false),
  color:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function listar(req, res) {
  const { materiaId, grupoId, desde, hasta, tipo } = req.query;
  const eventos = await calModel.listarEventos({
    usuarioId: req.usuario.id,
    materiaId: materiaId ? Number(materiaId) : null,
    grupoId: grupoId ? Number(grupoId) : null,
    desde: desde || null,
    hasta: hasta || null,
    tipo: tipo || null,
    soloPublicos: true
  });
  return ok(res, eventos);
}

export async function proximos(req, res) {
  const eventos = await calModel.proximosEventos(req.usuario.id, 5);
  return ok(res, eventos);
}

export async function obtener(req, res) {
  const evento = await calModel.obtenerEvento(Number(req.params.id));
  if (!evento) return noEncontrado(res, 'Evento no encontrado');
  if (evento.privado && evento.usuario_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'Evento privado');
  }
  return ok(res, evento);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const id = await calModel.crearEvento(null, {
    ...datos,
    usuarioId: req.usuario.id
  });
  return creado(res, { id }, 'Evento creado');
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().parse(req.body);
  const evento = await calModel.obtenerEvento(Number(req.params.id));
  if (!evento) return noEncontrado(res, 'Evento no encontrado');
  if (evento.usuario_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés editar este evento');
  }
  await calModel.actualizarEvento(null, evento.id, datos);
  return ok(res, null, 'Evento actualizado');
}

export async function eliminar(req, res) {
  const evento = await calModel.obtenerEvento(Number(req.params.id));
  if (!evento) return noEncontrado(res, 'Evento no encontrado');
  if (evento.usuario_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés eliminar este evento');
  }
  await calModel.eliminarEvento(null, evento.id);
  return ok(res, null, 'Evento eliminado');
}

export async function listarCompleto(req, res) {
  try {
    const eventos = await calModel.listarEventosCompleto({
      usuarioId: req.usuario.id,
      tipoUsuario: req.usuario.tipo,
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
    });
    return ok(res, eventos);
  } catch {
    return error(res, 500, 'Error al cargar el calendario');
  }
}
