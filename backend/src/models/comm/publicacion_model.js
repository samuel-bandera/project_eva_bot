
import { pool } from '../../config/db.js';

function parseEtiquetas(row) {
  if (!row) return row;
  if (row.etiquetas && typeof row.etiquetas === 'string') {
    try { row.etiquetas = JSON.parse(row.etiquetas); } catch { row.etiquetas = []; }
  }
  if (!row.etiquetas) row.etiquetas = [];
  return row;
}

export async function listarMensajesDeMateria(materiaId, { soloRaiz = false } = {}) {
  const where = ['f.materia_id = ?', 'f.eliminado = FALSE'];
  if (soloRaiz) where.push('f.padre_id IS NULL');

  const [rows] = await pool.query(
    `SELECT f.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.avatar AS autor_avatar
     FROM publicaciones f
     JOIN usuarios u ON u.id = f.autor_id
     WHERE ${where.join(' AND ')}
     ORDER BY f.fijado DESC, f.fecha DESC`,
    [materiaId]
  );
  return rows.map(parseEtiquetas);
}

export async function listarRespuestas(padreId) {
  const [rows] = await pool.query(
    `SELECT f.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.avatar AS autor_avatar
     FROM publicaciones f
     JOIN usuarios u ON u.id = f.autor_id
     WHERE f.padre_id = ? AND f.eliminado = FALSE
     ORDER BY f.fecha ASC`,
    [padreId]
  );
  return rows.map(parseEtiquetas);
}

export async function obtenerMensaje(id) {
  const [rows] = await pool.query(`SELECT * FROM publicaciones WHERE id = ?`, [id]);
  return rows[0] ? parseEtiquetas(rows[0]) : null;
}

export async function crearMensaje(conn, {
  materiaId, autorId, titulo, contenido, padreId = null, etiquetas = []
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO publicaciones
       (materia_id, autor_id, titulo, contenido, padre_id, etiquetas)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [materiaId, autorId, titulo, contenido, padreId,
     etiquetas.length ? JSON.stringify(etiquetas) : null]
  );
  return result.insertId;
}

export async function actualizarMensaje(conn, id, { titulo, contenido, etiquetas }) {
  const campos = [];
  const valores = [];
  if (titulo !== undefined)    { campos.push('titulo = ?');    valores.push(titulo); }
  if (contenido !== undefined) { campos.push('contenido = ?'); valores.push(contenido); }
  if (etiquetas !== undefined) {
    campos.push('etiquetas = ?');
    valores.push(etiquetas && etiquetas.length ? JSON.stringify(etiquetas) : null);
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE publicaciones SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function eliminarMensaje(conn, id) {
  await conn.query(`UPDATE publicaciones SET eliminado = TRUE WHERE id = ?`, [id]);
}

export async function fijarMensaje(conn, id, fijado) {
  await conn.query(`UPDATE publicaciones SET fijado = ? WHERE id = ?`, [fijado, id]);
}

export async function cerrarMensaje(conn, id, cerrado) {
  await conn.query(`UPDATE publicaciones SET cerrado = ? WHERE id = ?`, [cerrado, id]);
}

export async function crearReporte(conn, {
  mensajeId, reportadoPor, motivo, detalle = null, detectadoPor = 'usuario'
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO reportes_contenido
       (mensaje_id, reportado_por, motivo, detalle, detectado_por)
     VALUES (?, ?, ?, ?, ?)`,
    [mensajeId, reportadoPor, motivo, detalle, detectadoPor]
  );
  return result.insertId;
}

export async function listarReportes({ estado = 'pendiente' } = {}) {
  const [rows] = await pool.query(
    `SELECT r.*, f.titulo AS mensaje_titulo, f.contenido AS mensaje_contenido,
            u.nombre AS reportado_por_nombre, u.apellido AS reportado_por_apellido
     FROM reportes_contenido r
     JOIN publicaciones f ON f.id = r.mensaje_id
     LEFT JOIN usuarios u ON u.id = r.reportado_por
     WHERE r.estado = ?
     ORDER BY r.fecha DESC`,
    [estado]
  );
  return rows;
}

export async function resolverReporte(conn, { reporteId, resueltoPor, estado }) {
  await conn.query(
    `UPDATE reportes_contenido SET estado = ?, resuelto_por = ? WHERE id = ?`,
    [estado, resueltoPor, reporteId]
  );
}

