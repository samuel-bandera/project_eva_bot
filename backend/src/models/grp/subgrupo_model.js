
import { pool } from '../../config/db.js';

export async function listarSubgrupos({ grupoId = null, materiaId = null, tareaId = null, activo = true } = {}) {
  const where = ['s.activo = ?'];
  const params = [activo];
  if (grupoId)   { where.push('s.grupo_id = ?');   params.push(grupoId); }
  if (materiaId) { where.push('s.materia_id = ?'); params.push(materiaId); }
  if (tareaId)   { where.push('s.tarea_id = ?');   params.push(tareaId); }

  const [rows] = await pool.query(
    `SELECT s.*, u.nombre AS creador_nombre, u.apellido AS creador_apellido,
            m.nombre AS materia_nombre, t.titulo AS tarea_titulo,
            (SELECT COUNT(*) FROM subgrupo_alumnos sa WHERE sa.subgrupo_id = s.id) AS total_integrantes
     FROM subgrupos s
     JOIN usuarios u ON u.id = s.creado_por
     LEFT JOIN materias m ON m.id = s.materia_id
     LEFT JOIN tareas t ON t.id = s.tarea_id
     WHERE ${where.join(' AND ')}
     ORDER BY s.creado_en DESC`,
    params
  );
  return rows;
}

export async function obtenerSubgrupo(id) {
  const [rows] = await pool.query(`SELECT * FROM subgrupos WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function listarIntegrantes(subgrupoId) {
  const [rows] = await pool.query(
    `SELECT sa.id AS integracion_id, sa.rol, sa.fecha_union,
            u.id, u.nombre, u.apellido, u.usuario, u.email, u.avatar
     FROM subgrupo_alumnos sa
     JOIN usuarios u ON u.id = sa.alumno_id
     WHERE sa.subgrupo_id = ?
     ORDER BY sa.rol DESC, sa.fecha_union ASC`,
    [subgrupoId]
  );
  return rows;
}

export async function crearSubgrupo(conn, {
  grupoId, materiaId = null, tareaId = null, nombre, descripcion = null,
  tipoCreacion = 'docente', maxIntegrantes = 5, minIntegrantes = 2, creadoPor
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO subgrupos
       (grupo_id, materia_id, tarea_id, nombre, descripcion,
        tipo_creacion, max_integrantes, min_integrantes, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [grupoId, materiaId, tareaId, nombre, descripcion,
     tipoCreacion, maxIntegrantes, minIntegrantes, creadoPor]
  );
  return result.insertId;
}

export async function actualizarSubgrupo(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['nombre', 'descripcion', 'max_integrantes', 'min_integrantes', 'activo'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE subgrupos SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function agregarIntegrante(conn, { subgrupoId, alumnoId, rol = 'integrante' }) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO subgrupo_alumnos (subgrupo_id, alumno_id, rol)
     VALUES (?, ?, ?)`,
    [subgrupoId, alumnoId, rol]
  );
  return result.insertId;
}

export async function quitarIntegrante(conn, { subgrupoId, alumnoId }) {
  await conn.query(
    `DELETE FROM subgrupo_alumnos WHERE subgrupo_id = ? AND alumno_id = ?`,
    [subgrupoId, alumnoId]
  );
}

export async function contarIntegrantes(subgrupoId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM subgrupo_alumnos WHERE subgrupo_id = ?`,
    [subgrupoId]
  );
  return rows[0].total;
}

export async function crearEntregaGrupal(conn, {
  subgrupoId, tareaId = null, evaluacionId = null,
  titulo, descripcion = null, archivoId = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO entregas_grupales
       (subgrupo_id, tarea_id, evaluacion_id, titulo, descripcion)
     VALUES (?, ?, ?, ?, ?)`,
    [subgrupoId, tareaId, evaluacionId, titulo, descripcion]
  );
  return result.insertId;
}

export async function listarEntregasDeSubgrupo(subgrupoId) {
  const [rows] = await pool.query(
    `SELECT eg.*, t.titulo AS tarea_titulo
     FROM entregas_grupales eg
     LEFT JOIN tareas t ON t.id = eg.tarea_id
     WHERE eg.subgrupo_id = ?
     ORDER BY eg.fecha_entrega DESC`,
    [subgrupoId]
  );
  return rows;
}

export async function obtenerEntregaGrupal(id) {
  const [rows] = await pool.query(`SELECT * FROM entregas_grupales WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function calificarEntregaGrupal(conn, id, { nota, comentarioProfesor = null, estado = 'aprobada' }) {
  await conn.query(
    `UPDATE entregas_grupales
     SET nota = ?, comentario_docente = ?, estado = ?, actualizado_en = NOW()
     WHERE id = ?`,
    [nota, comentarioProfesor, estado, id]
  );
}

