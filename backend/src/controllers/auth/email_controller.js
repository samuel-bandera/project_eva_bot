
import * as emailModel from '../../models/auth/correo_model.js';
import { ok } from '../../utils/respuestas.js';

export async function listarPendientes(req, res) {
  const pendientes = await emailModel.listarPendientes();
  return ok(res, pendientes);
}

export async function estadisticas(req, res) {
  const stats = await emailModel.estadisticas();
  return ok(res, stats);
}

