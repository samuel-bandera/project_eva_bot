import { pool } from '../config/db.js';
import { emitirNotificacion } from './socket_service.js';

export async function crearYEnviarNotificacion({
  usuarioId,
  titulo,
  mensaje = null,
  tipo = 'info',
  url = null,
}) {
  let notificacionId = null;

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, titulo, mensaje, tipo, url]
    );
    notificacionId = resultado.insertId;
  } catch (err) {
    console.error('Error guardando notificación en DB:', err.message);
  }

  const notificacion = {
    id: notificacionId || Date.now(),
    usuario_id: usuarioId,
    titulo,
    mensaje,
    tipo,
    url,
    leida: false,
    fecha: new Date().toISOString(),
  };

  emitirNotificacion(usuarioId, notificacion);

  return notificacion;
}

export async function crearNotificacionMasiva({
  usuarioIds,
  titulo,
  mensaje = null,
  tipo = 'info',
  url = null,
}) {
  const creadas = [];
  for (const usuarioId of usuarioIds) {
    creadas.push(
      await crearYEnviarNotificacion({ usuarioId, titulo, mensaje, tipo, url })
    );
  }
  return creadas;
}

