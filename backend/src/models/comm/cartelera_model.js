
import { pool } from '../../config/db.js';

export async function listarAnuncios({ tipo = null, materiaId = null, grupoId = null, usuarioId = 0 } = {}) {
  const where = [];
  const params = [];
  if (tipo)      { where.push('c.tipo = ?');       params.push(tipo); }
  if (materiaId) { where.push('c.materia_id = ?'); params.push(materiaId); }
  if (grupoId)   { where.push('c.grupo_id = ?');   params.push(grupoId); }

  const [rows] = await pool.query(
    `SELECT c.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.avatar AS autor_avatar,
            m.nombre AS materia_nombre, g.nombre AS grupo_nombre,
            (SELECT COUNT(*) FROM cartelera_likes cl WHERE cl.anuncio_id = c.id) AS likes_count,
            (SELECT COUNT(*) > 0 FROM cartelera_likes cl WHERE cl.anuncio_id = c.id AND cl.usuario_id = ?) AS has_liked,
            (SELECT COUNT(*) FROM cartelera_comentarios cc WHERE cc.anuncio_id = c.id) AS comentarios_count
     FROM cartelera c
     JOIN usuarios u ON u.id = c.autor_id
     LEFT JOIN materias m ON m.id = c.materia_id
     LEFT JOIN grupos_principales g ON g.id = c.grupo_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY c.fijado DESC, c.fecha DESC`,
    [usuarioId, ...params]
  );
  return rows;
}

export async function toggleLike(anuncioId, usuarioId) {
  const [existe] = await pool.query('SELECT id FROM cartelera_likes WHERE anuncio_id = ? AND usuario_id = ?', [anuncioId, usuarioId]);
  if (existe.length > 0) {
    await pool.query('DELETE FROM cartelera_likes WHERE anuncio_id = ? AND usuario_id = ?', [anuncioId, usuarioId]);
    return false;
  } else {
    await pool.query('INSERT INTO cartelera_likes (anuncio_id, usuario_id) VALUES (?, ?)', [anuncioId, usuarioId]);
    return true;
  }
}

export async function addComentario(anuncioId, usuarioId, contenido) {
  await pool.query('INSERT INTO cartelera_comentarios (anuncio_id, usuario_id, contenido) VALUES (?, ?, ?)', [anuncioId, usuarioId, contenido]);
}

export async function getComentarios(anuncioId) {
  const [rows] = await pool.query(`
    SELECT cc.*, u.nombre, u.apellido, u.avatar FROM cartelera_comentarios cc
    JOIN usuarios u ON u.id = cc.usuario_id
    WHERE cc.anuncio_id = ? ORDER BY cc.fecha ASC
  `, [anuncioId]);
  return rows;
}

export async function obtenerAnuncio(id) {
  const [rows] = await pool.query(`SELECT * FROM cartelera WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function crearAnuncio(conn, {
  titulo, contenido, tipo = 'general',
  materiaId = null, grupoId = null, autorId, fijado = false, imagenUrl = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO cartelera
       (titulo, contenido, tipo, materia_id, grupo_id, autor_id, fijado, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, contenido, tipo, materiaId, grupoId, autorId, fijado, imagenUrl || null]
  );
  return result.insertId;
}

export async function actualizarAnuncio(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['titulo', 'contenido', 'fijado'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE cartelera SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function eliminarAnuncio(conn, id) {
  await conn.query(`DELETE FROM cartelera WHERE id = ?`, [id]);
}

