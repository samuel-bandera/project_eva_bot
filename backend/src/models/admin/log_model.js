
import { pool } from '../../config/db.js';

export async function registrarEvento(conn, {
  tipo, gravedad = 'info', usuarioId = null, entidad = null,
  entidadId = null, ip = null, userAgent = null, detalle = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO incidentes_seguridad
       (tipo, gravedad, usuario_id, entidad, entidad_id, ip, user_agent, detalle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [tipo, gravedad, usuarioId, entidad, entidadId, ip, userAgent, detalle]
  );
  return result.insertId;
}

export async function listarEventos({ tipo = null, gravedad = null, usuarioId = null, desde = null, hasta = null, limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (tipo)      { where.push('e.tipo = ?');      params.push(tipo); }
  if (gravedad)  { where.push('e.gravedad = ?');  params.push(gravedad); }
  if (usuarioId) { where.push('e.usuario_id = ?'); params.push(usuarioId); }
  if (desde)     { where.push('e.fecha >= ?');    params.push(desde); }
  if (hasta)     { where.push('e.fecha <= ?');    params.push(hasta); }

  const [rows] = await pool.query(
    `SELECT e.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM incidentes_seguridad e
     LEFT JOIN usuarios u ON u.id = e.usuario_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY e.fecha DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

export async function resolverEvento(conn, id) {
  await conn.query(`UPDATE incidentes_seguridad SET resuelto = TRUE WHERE id = ?`, [id]);
}

export async function registrarAuditoria(conn, {
  usuarioId, accion, entidad = null, entidadId = null,
  detalle = null, ip = null, userAgent = null
}) {
  const conexion = conn || pool;
  await conexion.query(
    `INSERT INTO registro_auditoria
       (usuario_id, accion, entidad, entidad_id, detalle, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, accion, entidad, entidadId, detalle, ip, userAgent]
  );
}

export async function listarAuditoria({ usuarioId = null, accion = null, desde = null, hasta = null, limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (usuarioId) { where.push('l.usuario_id = ?'); params.push(usuarioId); }
  if (accion)    { where.push('l.accion = ?');     params.push(accion); }
  if (desde)     { where.push('l.fecha >= ?');     params.push(desde); }
  if (hasta)     { where.push('l.fecha <= ?');     params.push(hasta); }

  const [rows] = await pool.query(
    `SELECT l.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM registro_auditoria l
     LEFT JOIN usuarios u ON u.id = l.usuario_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY l.fecha DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

