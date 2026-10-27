
import { pool } from '../../config/db.js';

export async function listarMaterias({ cicloId = null, activa = null, limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (cicloId) { where.push('m.ciclo_id = ?'); params.push(cicloId); }
  if (activa !== null) { where.push('m.activa = ?'); params.push(activa); }

  const sql = `
    SELECT m.*,
           c.nombre AS ciclo_nombre,
           (SELECT GROUP_CONCAT(CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ')
            FROM materias_docente mp
            JOIN usuarios u ON u.id = mp.docente_id
            WHERE mp.materia_id = m.id) AS docente_nombre,
           (SELECT COUNT(*) FROM materias_docente mp WHERE mp.materia_id = m.id) AS total_profesores,
           (SELECT COUNT(*) FROM matriculas mat
            WHERE mat.materia_id = m.id AND mat.estado IN ('activa','aprobada')) AS total_alumnos
    FROM materias m
    LEFT JOIN ciclos_electivos c ON c.id = m.ciclo_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.nombre ASC
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function listarMateriasPublicas({ limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT id, nombre, codigo, descripcion, color, icono,
            codigo_inscripcion, permite_solicitudes
     FROM materias
     WHERE es_publica = TRUE AND activa = TRUE
     ORDER BY nombre ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

export async function listarMateriasSolicitables(alumnoId) {
  const [rows] = await pool.query(
    `SELECT id, nombre, codigo, descripcion, color, icono,
            codigo_inscripcion, permite_solicitudes
     FROM materias
     WHERE permite_solicitudes = TRUE AND activa = TRUE
       AND id NOT IN (
         SELECT materia_id FROM matriculas WHERE alumno_id = ?
       )
     ORDER BY nombre ASC`,
    [alumnoId]
  );
  return rows;
}

export async function listarMateriasDeProfesor(profesorId) {
  const [rows] = await pool.query(
    `SELECT m.*, mp.fecha AS asignada_en
     FROM materias_docente mp
     JOIN materias m ON m.id = mp.materia_id
     WHERE mp.docente_id = ?
     ORDER BY m.nombre ASC`,
    [profesorId]
  );
  return rows;
}

export async function listarMateriasDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT
       m.*,
       m.nombre AS materia_nombre,
       m.codigo AS materia_codigo,
       mat.estado AS estado_matricula,
       mat.nota_final,
       mat.id AS matricula_id,
       (SELECT COUNT(*) FROM tareas t WHERE t.materia_id = m.id AND t.estado = 'publicada') AS total_tareas,
       (SELECT COUNT(*) FROM materiales ma WHERE ma.materia_id = m.id) AS total_materiales
     FROM matriculas mat
     JOIN materias m ON m.id = mat.materia_id
     WHERE mat.alumno_id = ?
     ORDER BY m.nombre ASC`,
    [alumnoId]
  );
  return rows;
}

export async function obtenerMateria(id) {
  const [rows] = await pool.query(
    `SELECT m.*, c.nombre AS ciclo_nombre
     FROM materias m
     LEFT JOIN ciclos_electivos c ON c.id = m.ciclo_id
     WHERE m.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function obtenerMateriaPorCodigo(codigo) {
  const [rows] = await pool.query(
    `SELECT * FROM materias WHERE codigo = ?`,
    [codigo]
  );
  return rows[0] || null;
}

export async function obtenerMateriaPorCodigoInscripcion(codigoInscripcion) {
  const [rows] = await pool.query(
    `SELECT * FROM materias
     WHERE codigo_inscripcion = ? AND activa = TRUE`,
    [codigoInscripcion]
  );
  return rows[0] || null;
}

export async function crearMateria(conn, {
  nombre, codigo, descripcion = null, cicloId = null, color = '#42b883',
  icono = null, aula = null, horario = null, esPublica = false,
  codigoInscripcion = null, permiteSolicitudes = true
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO materias
       (nombre, codigo, descripcion, ciclo_id, color, icono, aula, horario,
        es_publica, codigo_inscripcion, permite_solicitudes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, codigo, descripcion, cicloId, color, icono, aula, horario,
     esPublica, codigoInscripcion, permiteSolicitudes]
  );
  return result.insertId;
}

export async function actualizarMateria(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['nombre','descripcion','ciclo_id','color','icono','aula','horario',
                      'es_publica','codigo_inscripcion','permite_solicitudes','activa'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) {
      campos.push(`${k} = ?`);
      valores.push(datos[k]);
    }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE materias SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function desactivarMateria(conn, id) {
  await conn.query(`UPDATE materias SET activa = FALSE WHERE id = ?`, [id]);
}

export async function asignarProfesor(conn, { profesorId, materiaId }) {
  await conn.query(
    `INSERT IGNORE INTO materias_docente (docente_id, materia_id) VALUES (?, ?)`,
    [profesorId, materiaId]
  );
}

export async function quitarProfesor(conn, { profesorId, materiaId }) {
  await conn.query(
    `DELETE FROM materias_docente WHERE docente_id = ? AND materia_id = ?`,
    [profesorId, materiaId]
  );
}

export async function obtenerPonderaciones(materiaId, cicloId = 0) {
  const [rows] = await pool.query(
    `SELECT tipo, peso FROM pesos_calificacion WHERE materia_id = ? AND ciclo_id = ?`,
    [materiaId, cicloId]
  );
  return rows;
}

export async function guardarPonderaciones(conn, materiaId, cicloId, pesos_calificacion) {
  await conn.query(
    `DELETE FROM pesos_calificacion WHERE materia_id = ? AND ciclo_id = ?`,
    [materiaId, cicloId]
  );
  const values = Object.entries(pesos_calificacion).map(([tipo, peso]) => [materiaId, cicloId, tipo, peso]);
  if (values.length) {
    await conn.query(
      `INSERT INTO pesos_calificacion (materia_id, ciclo_id, tipo, peso) VALUES ?`,
      [values]
    );
  }
}


export async function obtenerCalificacionesDeMateria(alumnoId, materiaId) {
  const [matriculas] = await pool.query(
    `SELECT m.id, m.estado, m.nota_final, m.observacion,
            mt.nota_aprobacion
     FROM matriculas m
     JOIN materias mt ON mt.id = m.materia_id
     WHERE m.alumno_id = ? AND m.materia_id = ?`,
    [alumnoId, materiaId]
  );
  if (!matriculas.length) return null;

  const matricula = matriculas[0];

  const [pesos_calificacion] = await pool.query(
    `SELECT tipo, peso FROM pesos_calificacion WHERE materia_id = ? ORDER BY tipo`,
    [materiaId]
  );

  const [evaluaciones] = await pool.query(
    `SELECT ea.id, ea.nota, ea.estado, ea.fecha_envio, ea.fecha_inicio,
            e.titulo, e.tipo, e.nota_maxima
     FROM rendiciones ea
     JOIN evaluaciones e ON e.id = ea.evaluacion_id
     WHERE ea.alumno_id = ? AND e.materia_id = ?
       AND ea.estado IN ('enviada','corregida')
     ORDER BY ea.fecha_envio DESC`,
    [alumnoId, materiaId]
  );

  return { matricula, pesos_calificacion, evaluaciones };
}

export async function docenteDictaMateria(docenteId, materiaId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM materias_docente WHERE docente_id = ? AND materia_id = ? LIMIT 1`,
    [docenteId, materiaId]
  );
  return rows.length > 0;
}
