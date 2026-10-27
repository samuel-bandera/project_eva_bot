
import { pool } from '../../config/db.js';

export async function listarDelegadosDeGrupo(grupoId, { activo = true } = {}) {
  const [rows] = await pool.query(
    `SELECT d.*, u.nombre, u.apellido, u.usuario, u.avatar
     FROM delegados d
     JOIN usuarios u ON u.id = d.alumno_id
     WHERE d.grupo_id = ? AND d.activo = ?
     ORDER BY d.tipo ASC`,
    [grupoId, activo]
  );
  return rows;
}

export async function listarDelegadosDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT d.*, g.nombre AS grupo_nombre, g.codigo AS grupo_codigo
     FROM delegados d
     JOIN grupos_principales g ON g.id = d.grupo_id
     WHERE d.alumno_id = ? AND d.activo = TRUE`,
    [alumnoId]
  );
  return rows;
}

export async function crearDelegado(conn, {
  grupoId, alumnoId, tipo, periodoInicio, periodoFin = null, votosObtenidos = 0
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO delegados
       (grupo_id, alumno_id, tipo, periodo_inicio, periodo_fin, votos_obtenidos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [grupoId, alumnoId, tipo, periodoInicio, periodoFin, votosObtenidos]
  );
  return result.insertId;
}

export async function listarElecciones({ grupoId = null, estado = null } = {}) {
  const where = [];
  const params = [];
  if (grupoId) { where.push('e.grupo_id = ?'); params.push(grupoId); }
  if (estado)  { where.push('e.estado = ?');   params.push(estado); }

  const [rows] = await pool.query(
    `SELECT e.*, g.nombre AS grupo_nombre,
            u.nombre AS creador_nombre, u.apellido AS creador_apellido
     FROM elecciones e
     JOIN grupos_principales g ON g.id = e.grupo_id
     JOIN usuarios u ON u.id = e.creado_por
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY e.fecha_inicio DESC`,
    params
  );
  return rows;
}

export async function obtenerEleccion(id) {
  const [rows] = await pool.query(`SELECT * FROM elecciones WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function crearEleccion(conn, {
  grupoId, titulo, fechaInicio, fechaFin, creadoPor, estado = 'borrador'
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO elecciones
       (grupo_id, titulo, fecha_inicio, fecha_fin, creado_por, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [grupoId, titulo, fechaInicio, fechaFin, creadoPor, estado]
  );
  return result.insertId;
}

export async function actualizarEstadoEleccion(conn, id, estado) {
  await conn.query(`UPDATE elecciones SET estado = ? WHERE id = ?`, [estado, id]);
}

export async function listarCandidatos(eleccionId) {
  const [rows] = await pool.query(
    `SELECT c.*, u.nombre, u.apellido, u.usuario, u.avatar
     FROM candidatos c
     JOIN usuarios u ON u.id = c.alumno_id
     WHERE c.eleccion_id = ?
     ORDER BY c.tipo ASC, u.apellido ASC`,
    [eleccionId]
  );
  return rows;
}

export async function crearCandidato(conn, {
  eleccionId, alumnoId, tipo, propuesta = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO candidatos (eleccion_id, alumno_id, tipo, propuesta)
     VALUES (?, ?, ?, ?)`,
    [eleccionId, alumnoId, tipo, propuesta]
  );
  return result.insertId;
}

export async function obtenerCandidato(id) {
  const [rows] = await pool.query(`SELECT * FROM candidatos WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function registrarVoto(conn, {
  eleccionId, votanteId, candidatoId, tipo
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO votos (eleccion_id, votante_id, candidato_id, tipo)
     VALUES (?, ?, ?, ?)`,
    [eleccionId, votanteId, candidatoId, tipo]
  );
  return result.insertId;
}

export async function yaVoto(conn, { eleccionId, votanteId, tipo }) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT 1 FROM votos
     WHERE eleccion_id = ? AND votante_id = ? AND tipo = ?
     LIMIT 1`,
    [eleccionId, votanteId, tipo]
  );
  return rows.length > 0;
}

export async function resultados(eleccionId) {
  const [rows] = await pool.query(
    `SELECT c.id AS candidato_id, c.tipo, u.nombre, u.apellido,
            COUNT(v.id) AS total_votos
     FROM candidatos c
     JOIN usuarios u ON u.id = c.alumno_id
     LEFT JOIN votos v ON v.candidato_id = c.id
     WHERE c.eleccion_id = ?
     GROUP BY c.id
     ORDER BY c.tipo ASC, total_votos DESC`,
    [eleccionId]
  );
  return rows;
}

