
import * as notifModel from '../../models/comm/notificacion_model.js';
import { ok} from '../../utils/respuestas.js';

export async function listar(req, res) {
  const { soloNoLeidas, limit = 50 } = req.query;
  const notifs = await notifModel.listarNotificacionesDeUsuario(req.usuario.id, {
    soloNoLeidas: soloNoLeidas === 'true',
    limit: Number(limit)
  });
  return ok(res, notifs);
}

export async function contarNoLeidas(req, res) {
  const total = await notifModel.contarNoLeidas(req.usuario.id);
  return ok(res, { total });
}

export async function marcarLeida(req, res) {
  const { id } = req.params;
  await notifModel.marcarComoLeida(null, Number(id), req.usuario.id);
  return ok(res, null, 'Notificación marcada como leída');
}

export async function marcarTodasLeidas(req, res) {
  await notifModel.marcarTodasComoLeidas(null, req.usuario.id);
  return ok(res, null, 'Todas marcadas como leídas');
}

export async function eliminar(req, res) {
  const { id } = req.params;
  await notifModel.eliminarNotificacion(null, Number(id), req.usuario.id);
  return ok(res, null, 'Notificación eliminada');
}

