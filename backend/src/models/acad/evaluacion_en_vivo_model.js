import { pool } from '../../config/db.js';

export async function registrarEventoEnVivo(conn, {
  rendicionId, evaluacionId, alumnoId, tipo, detalle = null,
  ip = null, userAgent = null
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO monitoreo_examen
       (evaluacion_alumno_id, evaluacion_id, alumno_id, tipo, detalle, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [rendicionId, evaluacionId, alumnoId, tipo,
     detalle ? JSON.stringify(detalle) : null, ip, userAgent]
  );
  return result.insertId;
}

export async function actualizarHeartbeat(conn, rendicionId, preguntaActual = null) {
  const conexion = conn || pool;
  const campos = ['ultima_actividad = NOW()'];
  const valores = [];

  if (preguntaActual !== null) {
    campos.push('pregunta_actual = ?');
    valores.push(preguntaActual);
  }

  valores.push(rendicionId);
  await conexion.query(
    `UPDATE rendiciones SET ${campos.join(', ')} WHERE id = ?`,
    valores
  );
}

export async function incrementarSalidas(conn, rendicionId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE rendiciones
     SET salidas_detectadas = salidas_detectadas + 1
     WHERE id = ?`,
    [rendicionId]
  );
}

export async function agregarTiempoExtra(conn, rendicionId, segundos) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE rendiciones
     SET tiempo_extra_segundos = tiempo_extra_segundos + ?
     WHERE id = ?`,
    [segundos, rendicionId]
  );
}

export async function cerrarRendicion(conn, rendicionId, motivo = 'normal') {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE rendiciones
     SET estado = 'enviada',
         fecha_envio = NOW(),
         cerrada_en = NOW(),
         motivo_cierre = ?
     WHERE id = ?`,
    [motivo, rendicionId]
  );
}

export async function estadoEnVivo(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT
       ea.id AS rendicion_id,
       ea.alumno_id,
       u.nombre AS alumno_nombre,
       u.apellido AS alumno_apellido,
       u.usuario AS alumno_usuario,
       u.avatar AS alumno_avatar,
       ea.estado,
       ea.intento,
       ea.pregunta_actual,
       ea.tiempo_extra_segundos,
       ea.salidas_detectadas,
       ea.motivo_cierre,
       ea.fecha_inicio,
       ea.fecha_envio,
       ea.ultima_actividad,
       e.duracion_minutos,
       e.bloquear_salida,
       e.mostrar_tiempo,
       -- Segundos transcurridos desde el inicio
       TIMESTAMPDIFF(SECOND, ea.fecha_inicio, NOW()) AS segundos_transcurridos,
       -- Segundos totales permitidos (base + extra)
       (e.duracion_minutos * 60 + COALESCE(ea.tiempo_extra_segundos, 0)) AS segundos_totales,
       -- Segundos restantes
       GREATEST(0,
         (e.duracion_minutos * 60 + COALESCE(ea.tiempo_extra_segundos, 0))
         - TIMESTAMPDIFF(SECOND, ea.fecha_inicio, NOW())
       ) AS segundos_restantes,
       -- Cuántas preguntas respondió
       (SELECT COUNT(*) FROM respuestas r
        WHERE r.evaluacion_alumno_id = ea.id) AS preguntas_respondidas,
       -- Cuántas preguntas tiene la evaluación
       (SELECT COUNT(*) FROM preguntas_evaluacion ep
        WHERE ep.evaluacion_id = e.id) AS preguntas_totales,
       -- Segundos desde la última actividad
       TIMESTAMPDIFF(SECOND, ea.ultima_actividad, NOW()) AS segundos_inactivo
     FROM rendiciones ea
     JOIN usuarios u ON u.id = ea.alumno_id
     JOIN evaluaciones e ON e.id = ea.evaluacion_id
     WHERE ea.evaluacion_id = ?
     ORDER BY ea.fecha_inicio ASC`,
    [evaluacionId]
  );
  return rows;
}

export async function listarEventosEnVivo(evaluacionId, { limit = 100 } = {}) {
  const [rows] = await pool.query(
    `SELECT ev.*, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
     FROM monitoreo_examen ev
     JOIN usuarios u ON u.id = ev.alumno_id
     WHERE ev.evaluacion_id = ?
     ORDER BY ev.fecha DESC
     LIMIT ?`,
    [evaluacionId, limit]
  );
  return rows;
}

export async function estaEnCurso(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM evaluaciones
     WHERE id = ? AND estado IN ('publicada', 'abierta')
     LIMIT 1`,
    [evaluacionId]
  );
  return rows.length > 0;
}

