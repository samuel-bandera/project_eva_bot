import { pool } from '../../config/db.js';

export async function listarTodas() {
  const [filas] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM materias WHERE carrera_id = c.id AND activa = 1) AS total_materias
     FROM carreras c WHERE c.activo = 1 ORDER BY c.nivel, c.nombre`
  );
  return filas;
}

export async function listarDeCoordinador(coordinadorId) {
  const [filas] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM materias WHERE carrera_id = c.id AND activa = 1) AS total_materias
     FROM carreras c
     INNER JOIN coordinadores_carrera cc ON cc.carrera_id = c.id
     WHERE cc.coordinador_id = ? AND c.activo = 1
     ORDER BY c.nivel, c.nombre`,
    [coordinadorId]
  );
  return filas;
}

export async function obtenerPorId(id) {
  const [filas] = await pool.query('SELECT * FROM carreras WHERE id = ?', [id]);
  return filas[0] || null;
}

export async function materiasDeCarrera(carreraId) {
  const [filas] = await pool.query(
    `SELECT m.id, m.nombre, m.codigo, m.color,
      GROUP_CONCAT(CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') AS docentes
     FROM materias m
     LEFT JOIN materias_docente md ON md.materia_id = m.id
     LEFT JOIN usuarios u ON u.id = md.docente_id
     WHERE m.carrera_id = ? AND m.activa = 1
     GROUP BY m.id ORDER BY m.nombre`,
    [carreraId]
  );
  return filas;
}

export async function docentesDeCarrera(carreraId) {
  const [filas] = await pool.query(
    `SELECT DISTINCT u.id, u.nombre, u.apellido, u.email
     FROM usuarios u
     INNER JOIN materias_docente md ON md.docente_id = u.id
     INNER JOIN materias m ON m.id = md.materia_id
     WHERE m.carrera_id = ? AND u.tipo = 'docente' AND u.activo = 1
     ORDER BY u.apellido, u.nombre`,
    [carreraId]
  );
  return filas;
}

export async function alumnosDeCarrera(carreraId) {
  const [filas] = await pool.query(
    `SELECT u.id, u.nombre, u.apellido, u.email,
      ROUND(AVG(mat.nota_final), 2) AS promedio,
      COUNT(mat.nota_final) AS notas_registradas
     FROM usuarios u
     INNER JOIN matriculas mat ON mat.alumno_id = u.id
     INNER JOIN materias m ON m.id = mat.materia_id
     WHERE m.carrera_id = ? AND u.tipo = 'alumno' AND u.activo = 1
     GROUP BY u.id ORDER BY u.apellido, u.nombre`,
    [carreraId]
  );
  return filas;
}
