import { pool } from '../config/db.js';

// ============ USUARIOS ============
export async function crearUsuario({ nombre, apellido, usuario, contrasena, tipo }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre, apellido, usuario, contrasena, tipo)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, apellido, usuario, contrasena, tipo]
  );
  return result.insertId;
}

export async function buscarUsuarioPorNombre(usuario) {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE usuario = ? LIMIT 1',
    [usuario]
  );
  return rows[0] || null;
}

export async function buscarUsuarioPorId(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre, apellido, usuario, tipo FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

// ============ EVALUACIONES ============
export async function listarEvaluaciones({ profesorId, alumnoId }) {
  if (profesorId) {
    const [rows] = await pool.query(
      `SELECT e.*, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
       FROM evaluaciones e
       JOIN usuarios u ON u.id = e.profesor_id
       WHERE e.profesor_id = ?
       ORDER BY e.fecha DESC`,
      [profesorId]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT e.*, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
            ea.nota, ea.id AS rendicion_id
     FROM evaluaciones e
     JOIN usuarios u ON u.id = e.profesor_id
     LEFT JOIN evaluaciones_alumnos ea
       ON ea.evaluacion_id = e.id AND ea.alumno_id = ?
     ORDER BY e.fecha DESC`,
    [alumnoId]
  );
  return rows;
}

export async function crearEvaluacion({ titulo, descripcion, profesorId, fecha, preguntas }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO evaluaciones (titulo, descripcion, profesor_id, fecha)
       VALUES (?, ?, ?, ?)`,
      [titulo, descripcion || null, profesorId, fecha]
    );
    const evaluacionId = result.insertId;

    for (const p of preguntas) {
      await conn.query(
        `INSERT INTO preguntas (evaluacion_id, pregunta, respuesta_correcta)
         VALUES (?, ?, ?)`,
        [evaluacionId, p.pregunta, p.respuesta_correcta]
      );
    }

    await conn.commit();
    return evaluacionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function obtenerEvaluacion(id) {
  const [ev] = await pool.query(
    `SELECT e.*, u.nombre AS profesor_nombre, u.apellido AS profesor_apellido
     FROM evaluaciones e
     JOIN usuarios u ON u.id = e.profesor_id
     WHERE e.id = ?`,
    [id]
  );
  if (!ev[0]) return null;

  const [preguntas] = await pool.query(
    `SELECT id, pregunta, respuesta_correcta FROM preguntas WHERE evaluacion_id = ?`,
    [id]
  );

  return { ...ev[0], preguntas };
}

// ============ RENDICIONES ============
export async function crearRendicion({ evaluacionId, alumnoId }) {
  const [result] = await pool.query(
    `INSERT INTO evaluaciones_alumnos (evaluacion_id, alumno_id)
     VALUES (?, ?)`,
    [evaluacionId, alumnoId]
  );
  return result.insertId;
}

export async function guardarRespuesta({ rendicionId, preguntaId, respuesta }) {
  const [result] = await pool.query(
    `INSERT INTO respuestas (evaluacion_alumno_id, pregunta_id, respuesta)
     VALUES (?, ?, ?)`,
    [rendicionId, preguntaId, respuesta]
  );
  return result.insertId;
}

export async function listarRendiciones(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT ea.*, u.nombre, u.apellido, u.usuario
     FROM evaluaciones_alumnos ea
     JOIN usuarios u ON u.id = ea.alumno_id
     WHERE ea.evaluacion_id = ?
     ORDER BY ea.fecha DESC`,
    [evaluacionId]
  );
  return rows;
}