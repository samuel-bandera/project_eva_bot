
import { pool } from '../../config/db.js';

export async function listarTareasDeMateria(materiaId, { estado = null } = {}) {
  const params = [materiaId];
  let sql = `
    SELECT t.*, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
    FROM tareas t
    JOIN usuarios u ON u.id = t.asignada_por
    WHERE t.materia_id = ?`;
  if (estado) {
    sql += ' AND t.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY t.fecha_entrega DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function listarTareasDeAlumno(alumnoId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT t.*, m.nombre AS materia_nombre, m.codigo AS materia_codigo,
            u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
            ec.id AS entrega_id, ec.estado AS estado_entrega, ec.fecha AS entrega_fecha, ec.nota AS entrega_nota, ec.comentario AS entrega_comentario, ec.nombre_archivo AS entrega_archivo, ec.ruta_archivo AS entrega_ruta
     FROM tareas t
     JOIN materias m ON m.id = t.materia_id
     JOIN usuarios u ON u.id = t.asignada_por
     JOIN matriculas mat
          ON mat.materia_id = t.materia_id
         AND mat.alumno_id  = ?
         AND mat.estado IN ('activa','aprobada')
     LEFT JOIN entregas_codigo ec ON ec.tarea_id = t.id AND ec.alumno_id = ?
     WHERE t.estado IN ('publicada','cerrada')
     ORDER BY t.fecha_entrega DESC
     LIMIT ? OFFSET ?`,
    [alumnoId, alumnoId, limit, offset]
  );
  return rows;
}

export async function listarTareasDeProfesor(profesorId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT t.*, m.nombre AS materia_nombre,
            (SELECT COUNT(*) FROM entregas_codigo ec WHERE ec.tarea_id = t.id) AS total_entregas
     FROM tareas t
     LEFT JOIN materias m ON m.id = t.materia_id
     WHERE t.asignada_por = ?
     ORDER BY t.fecha_entrega DESC
     LIMIT ? OFFSET ?`,
    [profesorId, limit, offset]
  );
  return rows;
}

export async function obtenerTarea(id) {
  const [rows] = await pool.query(
    `SELECT t.*, m.nombre AS materia_nombre,
            u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
     FROM tareas t
     LEFT JOIN materias m ON m.id = t.materia_id
     JOIN usuarios u ON u.id = t.asignada_por
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function crearTarea(conn, {
  titulo, descripcion = null, materiaId = null, asignadaPor,
  fechaEntrega, fechaCierre = null, estado = 'borrador',
  ponderacion = 1.00, color = '#42b883'
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO tareas
       (titulo, descripcion, materia_id, asignada_por,
        fecha_entrega, fecha_cierre, estado, ponderacion, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, descripcion, materiaId, asignadaPor,
     fechaEntrega, fechaCierre, estado, ponderacion, color]
  );
  return result.insertId;
}

export async function actualizarEstadoTarea(conn, tareaId, estado) {
  const conexion = conn || pool;
  await conexion.query(`UPDATE tareas SET estado = ? WHERE id = ?`, [estado, tareaId]);
}

export async function eliminarTarea(conn, tareaId) {
  const conexion = conn || pool;
  await conexion.query(`DELETE FROM tareas WHERE id = ?`, [tareaId]);
}

