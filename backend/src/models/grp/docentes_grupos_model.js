import { pool } from '../../config/db.js';


export async function listarPorGrupo(grupoId) {
  const [rows] = await pool.query(
    `SELECT
       dg.id,
       dg.docente_id,
       dg.grupo_id,
       dg.materia_id,
       dg.tipo_docente,
       dg.activo,
       dg.fecha_asignacion,
       u.nombre   AS docente_nombre,
       u.apellido AS docente_apellido,
       u.usuario  AS docente_usuario,
       m.nombre   AS materia_nombre,
       m.codigo   AS materia_codigo
     FROM docentes_grupos dg
     JOIN usuarios u ON u.id = dg.docente_id
     JOIN materias m ON m.id = dg.materia_id
     WHERE dg.grupo_id = ? AND dg.activo = 1
     ORDER BY m.nombre, u.apellido, u.nombre`,
    [grupoId]
  );
  return rows;
}


export async function crear({ docenteId, grupoId, materiaId, asignadoPor, tipoAsignador, tipoDocente }) {
  const [result] = await pool.query(
    `INSERT INTO docentes_grupos
       (docente_id, grupo_id, materia_id, asignado_por, tipo_asignador, tipo_docente, activo)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE activo = 1, tipo_docente = VALUES(tipo_docente)`,
    [docenteId, grupoId, materiaId, asignadoPor, tipoAsignador, tipoDocente]
  );
  return result.insertId;
}


export async function desactivar(id) {
  await pool.query('UPDATE docentes_grupos SET activo = 0 WHERE id = ?', [id]);
}
