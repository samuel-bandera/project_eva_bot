
import { pool } from '../../config/db.js';

export async function encolar(conn, { destinatario, asunto, cuerpoHtml }) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO correos_pendientes (destinatario, asunto, cuerpo_html)
     VALUES (?, ?, ?)`,
    [destinatario, asunto, cuerpoHtml]
  );
  return result.insertId;
}

export async function encolarMasivo(conn, filas) {
  if (!filas.length) return 0;
  const [result] = await conn.query(
    `INSERT INTO correos_pendientes (destinatario, asunto, cuerpo_html) VALUES ?`,
    [filas]
  );
  return result.affectedRows;
}

export async function listarPendientes(limit = 50) {
  const [rows] = await pool.query(
    `SELECT * FROM correos_pendientes
     WHERE estado = 'pendiente' AND intentos < 3
     ORDER BY fecha_creacion ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function marcarEnviado(conn, id) {
  await conn.query(
    `UPDATE correos_pendientes
     SET estado = 'enviado', fecha_envio = NOW(), intentos = intentos + 1
     WHERE id = ?`,
    [id]
  );
}

export async function marcarError(conn, id, errorMensaje) {
  await conn.query(
    `UPDATE correos_pendientes
     SET estado = IF(intentos + 1 >= 3, 'error', 'pendiente'),
         intentos = intentos + 1,
         error_mensaje = ?
     WHERE id = ?`,
    [errorMensaje, id]
  );
}

export async function estadisticas() {
  const [rows] = await pool.query(
    `SELECT estado, COUNT(*) AS total FROM correos_pendientes GROUP BY estado`
  );
  return rows;
}

