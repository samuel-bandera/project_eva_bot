import { pool } from '../../config/db.js';

export async function crearRendicion(conn, { evaluacionId, alumnoId, intento = null }) {
  const conexion = conn || pool;

  let intentoFinal = intento;
  if (intentoFinal === null) {
    const [maxRows] = await conexion.query(
      'SELECT COALESCE(MAX(intento), 0) + 1 AS siguiente FROM rendiciones WHERE evaluacion_id = ? AND alumno_id = ?',
      [evaluacionId, alumnoId]
    );
    intentoFinal = maxRows[0].siguiente;
  }

  const [result] = await conexion.query(
    `INSERT INTO rendiciones (evaluacion_id, alumno_id, intento, estado, fecha_inicio)
     VALUES (?, ?, ?, 'en_progreso', NOW())`,
    [evaluacionId, alumnoId, intentoFinal]
  );
  return result.insertId;
}

export async function obtenerRendicionEnProgreso(evaluacionId, alumnoId) {
  const [rows] = await pool.query(
    `SELECT * FROM rendiciones
     WHERE evaluacion_id = ? AND alumno_id = ? AND estado = 'en_progreso'
     ORDER BY intento DESC LIMIT 1`,
    [evaluacionId, alumnoId]
  );
  return rows[0] || null;
}

export async function obtenerRendicion(rendicionId) {
  const [rows] = await pool.query(
    `SELECT ea.*, u.nombre, u.apellido, u.usuario, u.email,
            e.titulo, e.materia_id, e.nota_maxima
     FROM rendiciones ea
     JOIN usuarios u ON u.id = ea.alumno_id
     JOIN evaluaciones e ON e.id = ea.evaluacion_id
     WHERE ea.id = ?`,
    [rendicionId]
  );
  return rows[0] || null;
}

export async function enviarRendicion(conn, rendicionId) {
  await (conn || pool).query(
    `UPDATE rendiciones
     SET estado = 'enviada', fecha_envio = NOW()
     WHERE id = ?`,
    [rendicionId]
  );
}

export async function listarRendicionesDeEvaluacion(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT ea.*, u.nombre, u.apellido, u.usuario, u.email
     FROM rendiciones ea
     JOIN usuarios u ON u.id = ea.alumno_id
     WHERE ea.evaluacion_id = ?
     ORDER BY ea.fecha_inicio DESC`,
    [evaluacionId]
  );
  return rows;
}

export async function guardarRespuesta(conn, {
  rendicionId, evaluacionId, evaluacionPreguntaId, respuesta
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO respuestas
       (evaluacion_alumno_id, evaluacion_pregunta_id, evaluacion_id, respuesta)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE respuesta = VALUES(respuesta)`,
    [rendicionId, evaluacionPreguntaId, evaluacionId, respuesta]
  );
  return result.insertId || null;
}

export async function listarRespuestasDeRendicion(rendicionId) {
  const [rows] = await pool.query(
    `SELECT r.*, ep.pregunta, ep.respuesta_correcta, ep.puntaje, ep.orden
     FROM respuestas r
     JOIN preguntas_evaluacion ep ON ep.id = r.evaluacion_pregunta_id
     WHERE r.evaluacion_alumno_id = ?
     ORDER BY ep.orden ASC`,
    [rendicionId]
  );
  return rows;
}

export async function marcarPendienteAutorizacion(rendicionId) {
  await pool.query(
    'UPDATE rendiciones SET pendiente_autorizacion = 1 WHERE id = ?',
    [rendicionId]
  );
}

export async function autorizarRendicion(rendicionId) {
  await pool.query(
    'UPDATE rendiciones SET pendiente_autorizacion = 0 WHERE id = ?',
    [rendicionId]
  );
}

export async function listarRendicionesPendientesAutorizacion(docenteId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
            e.titulo AS evaluacion_titulo
     FROM rendiciones r
     JOIN usuarios u ON u.id = r.alumno_id
     JOIN evaluaciones e ON e.id = r.evaluacion_id
     WHERE e.docente_id = ? AND r.pendiente_autorizacion = 1
     ORDER BY r.ultima_actividad DESC`,
    [docenteId]
  );
  return rows;
}

