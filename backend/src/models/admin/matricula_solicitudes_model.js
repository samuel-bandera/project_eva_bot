import { pool } from '../../config/db.js';

export async function listarSolicitudesDeAlumno(alumnoId, estado = null) {
  const params = [alumnoId];
  let sql = `
    SELECT s.*, m.nombre AS materia_nombre, m.codigo AS materia_codigo
    FROM solicitudes_matricula s
    JOIN materias m ON m.id = s.materia_id
    WHERE s.alumno_id = ?`;
  if (estado) {
    sql += ' AND s.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY s.fecha_solicitud DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function listarSolicitudesDeProfesor(profesorId, estado = 'pendiente') {
  const [rows] = await pool.query(
    `SELECT s.*, m.nombre AS materia_nombre, m.codigo AS materia_codigo,
            u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
            u.email  AS alumno_email
     FROM solicitudes_matricula s
     JOIN materias m           ON m.id = s.materia_id
     JOIN usuarios u           ON u.id = s.alumno_id
     JOIN materias_docente mp ON mp.materia_id = s.materia_id
     WHERE mp.docente_id = ? AND s.estado = ?
     ORDER BY s.fecha_solicitud ASC`,
    [profesorId, estado]
  );
  return rows;
}

export async function listarTodasLasSolicitudes(estado = null) {
  const params = [];
  let sql = `
    SELECT s.*, m.nombre AS materia_nombre,
           u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
           u.email  AS alumno_email
    FROM solicitudes_matricula s
    JOIN materias m ON m.id = s.materia_id
    JOIN usuarios u ON u.id = s.alumno_id`;
  if (estado) {
    sql += ' WHERE s.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY s.fecha_solicitud DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function tieneSolicitudPendiente(conn, alumnoId, materiaId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT 1 FROM solicitudes_matricula
     WHERE alumno_id = ? AND materia_id = ? AND estado = 'pendiente'`,
    [alumnoId, materiaId]
  );
  return rows.length > 0;
}

export async function crearSolicitud(conn, { alumnoId, materiaId, mensaje }) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO solicitudes_matricula (alumno_id, materia_id, mensaje)
     VALUES (?, ?, ?)`,
    [alumnoId, materiaId, mensaje || null]
  );
  return result.insertId;
}

export async function obtenerSolicitudPendiente(conn, solicitudId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT * FROM solicitudes_matricula WHERE id = ? AND estado = 'pendiente'`,
    [solicitudId]
  );
  return rows[0] || null;
}

export async function marcarSolicitudResuelta(conn, { id, estado, respuesta, aprobadoPor }) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE solicitudes_matricula
     SET estado = ?, respuesta = ?, aprobado_por = ?, fecha_respuesta = NOW()
     WHERE id = ?`,
    [estado, respuesta || null, aprobadoPor, id]
  );
}

