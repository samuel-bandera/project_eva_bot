
import { pool } from '../../config/db.js';

export async function listarEntregasDeTarea(tareaId) {
  const [rows] = await pool.query(
    `SELECT ec.*, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
            u.usuario AS alumno_usuario
     FROM entregas_codigo ec
     JOIN usuarios u ON u.id = ec.alumno_id
     WHERE ec.tarea_id = ?
     ORDER BY ec.fecha DESC`,
    [tareaId]
  );
  return rows;
}

export async function listarEntregasDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT ec.*, t.titulo AS tarea_titulo, m.nombre AS materia_nombre
     FROM entregas_codigo ec
     LEFT JOIN tareas t ON t.id = ec.tarea_id
     LEFT JOIN materias m ON m.id = t.materia_id
     WHERE ec.alumno_id = ?
     ORDER BY ec.fecha DESC`,
    [alumnoId]
  );
  return rows;
}

export async function obtenerEntrega(id) {
  const [rows] = await pool.query(
    `SELECT ec.*, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
     FROM entregas_codigo ec
     JOIN usuarios u ON u.id = ec.alumno_id
     WHERE ec.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function crearEntrega(conn, {
  alumnoId, profesorId, tareaId = null, evaluacionId = null,
  archivoId = null, nombreArchivo, rutaArchivo
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO entregas_codigo
       (alumno_id, docente_id, tarea_id, evaluacion_id, archivo_id,
        nombre_archivo, ruta_archivo, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [alumnoId, profesorId, tareaId, evaluacionId, archivoId,
     nombreArchivo, rutaArchivo]
  );
  return result.insertId;
}

export async function cambiarEstadoEntrega(conn, id, estado) {
  await conn.query(`UPDATE entregas_codigo SET estado = ? WHERE id = ?`, [estado, id]);
}

