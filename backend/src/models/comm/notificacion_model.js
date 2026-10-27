
import { pool } from '../../config/db.js';

export async function listarNotificacionesDeUsuario(usuarioId, { soloNoLeidas = false, limit = 50 } = {}) {
  const params = [usuarioId];
  let sql = `SELECT * FROM notificaciones WHERE usuario_id = ?`;
  if (soloNoLeidas) sql += ' AND leida = FALSE';
  sql += ' ORDER BY fecha DESC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function contarNoLeidas(usuarioId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM notificaciones
     WHERE usuario_id = ? AND leida = FALSE`,
    [usuarioId]
  );
  return rows[0].total;
}

export async function crearNotificacion(conn, {
  usuarioId, titulo, mensaje = null, tipo = 'info', url = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, titulo, mensaje, tipo, url]
  );
  return result.insertId;
}

export async function crearNotificacionesMasivo(conn, filas) {
  if (!filas.length) return 0;
  const [result] = await conn.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url) VALUES ?`,
    [filas]
  );
  return result.affectedRows;
}

export async function marcarComoLeida(conn, notificacionId, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?`,
    [notificacionId, usuarioId]
  );
}

export async function marcarTodasComoLeidas(conn, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND leida = FALSE`,
    [usuarioId]
  );
}

export async function eliminarNotificacion(conn, notificacionId, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?`,
    [notificacionId, usuarioId]
  );
}

