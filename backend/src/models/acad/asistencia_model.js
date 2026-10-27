
import { pool } from '../../config/db.js';

export async function listarAsistenciaDeAlumno(alumnoId, { materiaId = null, desde = null, hasta = null } = {}) {
  const where = ['a.alumno_id = ?'];
  const params = [alumnoId];
  if (materiaId) { where.push('a.materia_id = ?'); params.push(materiaId); }
  if (desde) { where.push('a.fecha >= ?'); params.push(desde); }
  if (hasta) { where.push('a.fecha <= ?'); params.push(hasta); }

  const [rows] = await pool.query(
    `SELECT a.*, m.nombre AS materia_nombre, m.codigo AS materia_codigo,
            u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
     FROM asistencia a
     JOIN materias m ON m.id = a.materia_id
     JOIN usuarios u ON u.id = a.docente_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.fecha DESC`,
    params
  );
  return rows;
}

export async function resumenAsistenciaAlumno(alumnoId, materiaId = null) {
  const params = [alumnoId];
  let sql = `SELECT estado, COUNT(*) AS total FROM asistencia WHERE alumno_id = ?`;
  if (materiaId) {
    sql += ' AND materia_id = ?';
    params.push(materiaId);
  }
  sql += ' GROUP BY estado';
  const [rows] = await pool.query(sql, params);
  return rows.reduce((acc, r) => ({ ...acc, [r.estado]: r.total }), {});
}

export async function registrarAsistencia(conn, {
  alumnoId, materiaId, profesorId, sesionId = null,
  fecha, estado = 'presente', observacion = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO asistencia
       (alumno_id, materia_id, docente_id, sesion_id, fecha, estado, observacion)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       observacion = VALUES(observacion)`,
    [alumnoId, materiaId, profesorId, sesionId, fecha, estado, observacion]
  );
  return result.insertId || null;
}

export async function registrarAsistenciaMasiva(conn, filas, grupoId = null) {
  if (!filas.length) return 0;
  const conexion = conn || pool;
  const filasConGrupo = filas.map(f => [...f, grupoId]);
  const [result] = await conexion.query(
    `INSERT INTO asistencia
       (alumno_id, materia_id, docente_id, sesion_id, fecha, estado, observacion, grupo_id)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       observacion = VALUES(observacion),
       grupo_id = VALUES(grupo_id)`,
    [filasConGrupo]
  );
  return result.affectedRows;
}

export async function listarFaltasDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT f.*, m.nombre AS materia_nombre
     FROM faltas f
     LEFT JOIN materias m ON m.id = f.materia_id
     WHERE f.alumno_id = ?
     ORDER BY f.fecha DESC`,
    [alumnoId]
  );
  return rows;
}

export async function registrarFalta(conn, {
  alumnoId, profesorId, materiaId = null, fecha,
  motivo = null, justificada = false, observacion = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO faltas
       (alumno_id, docente_id, materia_id, fecha, motivo, justificada, observacion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alumnoId, profesorId, materiaId, fecha, motivo, justificada, observacion]
  );
  return result.insertId;
}

export async function justificarFalta(conn, faltaId, observacion) {
  await conn.query(
    `UPDATE faltas SET justificada = TRUE, observacion = ? WHERE id = ?`,
    [observacion, faltaId]
  );
}

export async function listarSesionesDeMateria(materiaId, grupoId = null) {
  const params = [materiaId];
  let filtroGrupo = '';
  if (grupoId) {
    filtroGrupo = ' AND (s.grupo_id = ? OR s.grupo_id IS NULL)';
    params.push(grupoId);
  }
  const [rows] = await pool.query(
    `SELECT s.*, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
            g.nombre AS grupo_nombre
     FROM sesiones_clase s
     JOIN usuarios u ON u.id = s.docente_id
     LEFT JOIN grupos_principales g ON g.id = s.grupo_id
     WHERE s.materia_id = ?${filtroGrupo}
     ORDER BY s.fecha DESC, s.hora_inicio ASC`,
    params
  );
  return rows;
}

export async function crearSesionClase(conn, {
  materiaId, profesorId, grupoId = null, titulo = null, fecha,
  horaInicio, horaFin, aula = null, tipo = 'teorica', observaciones = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO sesiones_clase
       (materia_id, docente_id, grupo_id, titulo, fecha, hora_inicio, hora_fin,
        aula, tipo, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [materiaId, profesorId, grupoId, titulo, fecha, horaInicio, horaFin,
     aula, tipo, observaciones]
  );
  return result.insertId;
}

export async function listarAlumnosDeGrupo(grupoId) {
  const [rows] = await pool.query(
    `SELECT u.id AS alumno_id, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
            u.email AS alumno_email, u.usuario AS alumno_usuario
     FROM grupo_alumnos ga
     JOIN usuarios u ON u.id = ga.alumno_id
     WHERE ga.grupo_id = ? AND ga.activo = 1
     ORDER BY u.apellido ASC, u.nombre ASC`,
    [grupoId]
  );
  return rows;
}

export async function obtenerFaltaConDocumento(faltaId) {
  const [rows] = await pool.query(
    `SELECT f.*, m.nombre AS materia_nombre,
            u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
     FROM faltas f
     LEFT JOIN materias m ON m.id = f.materia_id
     LEFT JOIN usuarios u ON u.id = f.alumno_id
     WHERE f.id = ?`,
    [faltaId]
  );
  return rows[0] || null;
}

export async function guardarDocumentoJustificacion(conn, faltaId, { documentoUrl, documentoNombre, documentoMime }) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE faltas SET
       documento_url = ?,
       documento_nombre = ?,
       documento_mime = ?,
       justificada = TRUE
     WHERE id = ?`,
    [documentoUrl, documentoNombre, documentoMime, faltaId]
  );
  return true;
}

export async function listarFaltasDeMateria(materiaId, grupoId = null) {
  const params = [materiaId];
  let filtroGrupo = '';
  if (grupoId) {
    filtroGrupo = ' AND f.alumno_id IN (SELECT alumno_id FROM grupo_alumnos WHERE grupo_id = ? AND activo = 1)';
    params.push(grupoId);
  }
  const [rows] = await pool.query(
    `SELECT f.*, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido, u.email AS alumno_email
     FROM faltas f
     JOIN usuarios u ON u.id = f.alumno_id
     WHERE f.materia_id = ?${filtroGrupo}
     ORDER BY f.justificada ASC, f.fecha DESC`,
    params
  );
  return rows;
}
