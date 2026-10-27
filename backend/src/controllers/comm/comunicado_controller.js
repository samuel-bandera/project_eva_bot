
import { z } from 'zod';
import * as comModel from '../../models/comm/comunicado_model.js';
import { ok, creado, noEncontrado, prohibido } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  titulo:                z.string().min(3).max(150),
  contenido:             z.string().min(3),
  destinatario:          z.enum(['todos', 'docentes', 'alumnos', 'materia', 'grupo']).default('todos'),
  materiaId:             z.coerce.number().int().positive().optional().nullable(),
  grupoId:               z.coerce.number().int().positive().optional().nullable(),
  fijado:                z.boolean().default(false),
  requiereConfirmacion:  z.boolean().default(false),
  enviarEmail:           z.boolean().default(true)
});

export async function listar(req, res) {
  const { destinatario, materiaId, grupoId } = req.query;
  const comunicados = await comModel.listarComunicados({
    destinatario: destinatario || null,
    materiaId: materiaId ? Number(materiaId) : null,
    grupoId: grupoId ? Number(grupoId) : null
  });
  return ok(res, comunicados);
}

export async function obtener(req, res) {
  const c = await comModel.obtenerComunicado(Number(req.params.id));
  if (!c) return noEncontrado(res, 'Comunicado no encontrado');
  const confirmaciones = await comModel.confirmacionesDeComunicado(c.id);
  return ok(res, { ...c, confirmaciones });
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const id = await comModel.crearComunicado(null, {
    ...datos,
    autorId: req.usuario.id
  });
  return creado(res, { id }, 'Comunicado publicado');
}

export async function confirmar(req, res) {
  const { id } = req.params;
  await comModel.confirmarComunicado(null, {
    comunicadoId: Number(id),
    usuarioId: req.usuario.id
  });
  return ok(res, null, 'Comunicado confirmado');
}

export async function eliminar(req, res) {
  const c = await comModel.obtenerComunicado(Number(req.params.id));
  if (!c) return noEncontrado(res, 'Comunicado no encontrado');
  if (c.autor_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el autor de este comunicado');
  }
  await comModel.eliminarComunicado(null, c.id);
  return ok(res, null, 'Comunicado eliminado');
}

