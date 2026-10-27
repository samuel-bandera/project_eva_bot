
import { pool } from '../../config/db.js';

export async function crearArchivo(conn, {
  nombreOriginal, nombreInterno, ruta, mimeType, tamanoBytes,
  hashSha256, subidoPor, tipoEntidad, entidadId = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO archivos
       (nombre_original, nombre_interno, ruta, mime_type, tamaño_bytes,
        hash_sha256, subido_por, tipo_entidad, entidad_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombreOriginal, nombreInterno, ruta, mimeType, tamanoBytes,
     hashSha256, subidoPor, tipoEntidad, entidadId]
  );
  return result.insertId;
}

export async function obtenerArchivo(id) {
  const [rows] = await pool.query(`SELECT * FROM archivos WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function buscarPorHash(hashSha256) {
  const [rows] = await pool.query(
    `SELECT * FROM archivos WHERE hash_sha256 = ? LIMIT 1`,
    [hashSha256]
  );
  return rows[0] || null;
}

export async function listarPorEntidad(tipoEntidad, entidadId) {
  const [rows] = await pool.query(
    `SELECT a.*, u.nombre AS subido_por_nombre, u.apellido AS subido_por_apellido
     FROM archivos a
     JOIN usuarios u ON u.id = a.subido_por
     WHERE a.tipo_entidad = ? AND a.entidad_id = ? AND a.activo = TRUE
     ORDER BY a.creado_en DESC`,
    [tipoEntidad, entidadId]
  );
  return rows;
}

export async function incrementarDescargas(conn, id) {
  const conexion = conn || pool;
  await conexion.query(`UPDATE archivos SET descargas = descargas + 1 WHERE id = ?`, [id]);
}

export async function desactivarArchivo(conn, id) {
  await conn.query(`UPDATE archivos SET activo = FALSE WHERE id = ?`, [id]);
}

export async function actualizarEntidad(conn, archivoId, tipoEntidad, entidadId) {
  await conn.query(
    `UPDATE archivos SET tipo_entidad = ?, entidad_id = ? WHERE id = ?`,
    [tipoEntidad, entidadId, archivoId]
  );
}

