
import { pool } from '../../config/db.js';

export async function listarMateriales({ materiaId = null, tipo = null, destacado = null } = {}) {
  const where = [];
  const params = [];
  if (materiaId) { where.push('m.materia_id = ?'); params.push(materiaId); }
  if (tipo)      { where.push('m.tipo = ?');       params.push(tipo); }
  if (destacado !== null) { where.push('m.destacado = ?'); params.push(destacado); }

  const [rows] = await pool.query(
    `SELECT m.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido,
            mat.nombre AS materia_nombre, mat.codigo AS materia_codigo
     FROM materiales m
     JOIN usuarios u ON u.id = m.subido_por
     LEFT JOIN materias mat ON mat.id = m.materia_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY m.destacado DESC, m.fecha DESC`,
    params
  );
  return rows;
}

export async function obtenerMaterial(id) {
  const [rows] = await pool.query(
    `SELECT m.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido,
            mat.nombre AS materia_nombre
     FROM materiales m
     JOIN usuarios u ON u.id = m.subido_por
     LEFT JOIN materias mat ON mat.id = m.materia_id
     WHERE m.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function crearMaterial(conn, {
  titulo, descripcion = null, tipo = 'apunte', materiaId = null,
  subidoPor, archivoId = null, nombreArchivo = null,
  rutaArchivo = null, urlExterna = null, destacado = false
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO materiales
       (titulo, descripcion, tipo, materia_id, subido_por,
        archivo_id, nombre_archivo, ruta_archivo, url_externa, destacado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, descripcion, tipo, materiaId, subidoPor,
     archivoId, nombreArchivo, rutaArchivo, urlExterna, destacado]
  );
  return result.insertId;
}

export async function actualizarMaterial(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['titulo', 'descripcion', 'tipo', 'destacado'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE materiales SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function eliminarMaterial(conn, id) {
  await conn.query(`DELETE FROM materiales WHERE id = ?`, [id]);
}

