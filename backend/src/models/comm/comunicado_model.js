
import { pool } from '../../config/db.js';

export async function listarComunicados({ destinatario = null, materiaId = null, grupoId = null } = {}) {
  const where = [];
  const params = [];
  if (destinatario) { where.push('c.destinatario = ?'); params.push(destinatario); }
  if (materiaId)    { where.push('c.materia_id = ?');   params.push(materiaId); }
  if (grupoId)      { where.push('c.grupo_id = ?');     params.push(grupoId); }

  const [rows] = await pool.query(
    `SELECT c.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido
     FROM comunicados c
     JOIN usuarios u ON u.id = c.autor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY c.fijado DESC, c.fecha DESC`,
    params
  );
  return rows;
}

export async function obtenerComunicado(id) {
  const [rows] = await pool.query(`SELECT * FROM comunicados WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function crearComunicado(conn, {
  titulo, contenido, autorId, destinatario = 'todos',
  materiaId = null, grupoId = null, fijado = false,
  requiereConfirmacion = false, enviarEmail = true
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO comunicados
       (titulo, contenido, autor_id, destinatario, materia_id, grupo_id,
        fijado, requiere_confirmacion, enviar_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, contenido, autorId, destinatario, materiaId, grupoId,
     fijado, requiereConfirmacion, enviarEmail]
  );
  return result.insertId;
}

export async function eliminarComunicado(conn, id) {
  await conn.query(`DELETE FROM comunicados WHERE id = ?`, [id]);
}

export async function confirmarComunicado(conn, { comunicadoId, usuarioId }) {
  const conexion = conn || pool;
  await conexion.query(
    `INSERT INTO confirmaciones_comunicados (comunicado_id, usuario_id, confirmado)
     VALUES (?, ?, TRUE)
     ON DUPLICATE KEY UPDATE confirmado = TRUE, fecha = NOW()`,
    [comunicadoId, usuarioId]
  );
}

export async function confirmacionesDeComunicado(comunicadoId) {
  const [rows] = await pool.query(
    `SELECT cc.*, u.nombre, u.apellido
     FROM confirmaciones_comunicados cc
     JOIN usuarios u ON u.id = cc.usuario_id
     WHERE cc.comunicado_id = ? AND cc.confirmado = TRUE
     ORDER BY cc.fecha DESC`,
    [comunicadoId]
  );
  return rows;
}

