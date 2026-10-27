
import * as logModel from '../../models/admin/log_model.js';
import { ok } from '../../utils/respuestas.js';

export async function listarEventos(req, res) {
  const { tipo, gravedad, usuarioId, desde, hasta, limit = 100, offset = 0 } = req.query;
  const eventos = await logModel.listarEventos({
    tipo: tipo || null,
    gravedad: gravedad || null,
    usuarioId: usuarioId ? Number(usuarioId) : null,
    desde: desde || null,
    hasta: hasta || null,
    limit: Number(limit),
    offset: Number(offset)
  });
  return ok(res, eventos);
}

export async function resolverEvento(req, res) {
  await logModel.resolverEvento(null, Number(req.params.id));
  return ok(res, null, 'Evento resuelto');
}

export async function listarAuditoria(req, res) {
  const { usuarioId, accion, desde, hasta, limit = 100, offset = 0 } = req.query;
  const logs = await logModel.listarAuditoria({
    usuarioId: usuarioId ? Number(usuarioId) : null,
    accion: accion || null,
    desde: desde || null,
    hasta: hasta || null,
    limit: Number(limit),
    offset: Number(offset)
  });
  return ok(res, logs);
}

