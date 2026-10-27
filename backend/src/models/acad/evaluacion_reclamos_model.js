import { pool } from '../../config/db.js';

export async function crearReclamo(conn, {
  alumnoId, evaluacionAlumnoId = null, tareaId = null, materiaId,
  tipoReclamo, notaCuestionada, motivo
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO reclamos_calificaciones
       (alumno_id, evaluacion_alumno_id, tarea_id, materia_id, tipo_reclamo,
        nota_cuestionada, motivo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alumnoId, evaluacionAlumnoId, tareaId, materiaId, tipoReclamo,
     notaCuestionada, motivo]
  );
  return result.insertId;
}

export async function resolverReclamo(conn, {
  reclamoId, revisorId, estado, resolucion, notaFinal = null
}) {
  await (conn || pool).query(
    `UPDATE reclamos_calificaciones
     SET estado = ?, revisor_id = ?, resolucion = ?,
         nota_final = ?, fecha_resolucion = NOW()
     WHERE id = ?`,
    [estado, revisorId, resolucion, notaFinal, reclamoId]
  );
}

export async function listarReclamosDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT r.*, m.nombre AS materia_nombre
     FROM reclamos_calificaciones r
     JOIN materias m ON m.id = r.materia_id
     WHERE r.alumno_id = ?
     ORDER BY r.fecha_reclamo DESC`,
    [alumnoId]
  );
  return rows;
}

export async function listarReclamosPendientes({ materiaId = null } = {}) {
  const params = [];
  let sql = `
    SELECT r.*, m.nombre AS materia_nombre,
           u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
    FROM reclamos_calificaciones r
    JOIN materias m ON m.id = r.materia_id
    JOIN usuarios u ON u.id = r.alumno_id
    WHERE r.estado IN ('pendiente','en_revision')`;
  if (materiaId) {
    sql += ' AND r.materia_id = ?';
    params.push(materiaId);
  }
  sql += ' ORDER BY r.fecha_reclamo ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

