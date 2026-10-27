import { pool } from '../../config/db.js';

export async function estadisticasEvaluacion(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT
        COUNT(*) AS total,
        COUNT(nota) AS corregidas,
        AVG(nota) AS promedio,
        MIN(nota) AS minima,
        MAX(nota) AS maxima,
        SUM(CASE WHEN nota >= 6 THEN 1 ELSE 0 END) AS aprobados,
        SUM(CASE WHEN nota < 6 AND nota IS NOT NULL THEN 1 ELSE 0 END) AS reprobados,
        AVG(TIMESTAMPDIFF(SECOND, fecha_inicio, fecha_envio)) AS tiempo_promedio_seg,
        SUM(CASE WHEN motivo_cierre = 'salida_pagina' THEN 1 ELSE 0 END) AS cierres_por_salida,
        SUM(CASE WHEN motivo_cierre = 'tiempo_agotado' THEN 1 ELSE 0 END) AS cierres_por_tiempo,
        SUM(salidas_detectadas) AS total_salidas
     FROM rendiciones
     WHERE evaluacion_id = ? AND estado IN ('enviada','corregida')`,
    [evaluacionId]
  );

  const totalPreguntas = await pool.query(
    `SELECT COUNT(*) AS total FROM preguntas_evaluacion WHERE evaluacion_id = ?`,
    [evaluacionId]
  );

  const stats = rows[0] || {};
  stats.preguntas_totales = totalPreguntas[0]?.[0]?.total || 0;


  for (const k of ['promedio', 'minima', 'maxima']) {
    if (stats[k] !== null && stats[k] !== undefined) {
      stats[k] = Number(stats[k]);
    }
  }

  return stats;
}

export async function resultadosEvaluacion(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT
        ea.id AS rendicion_id,
        ea.alumno_id,
        ea.intento,
        ea.nota,
        ea.estado,
        ea.fecha_inicio,
        ea.fecha_envio,
        ea.motivo_cierre,
        ea.salidas_detectadas,
        ea.tiempo_extra_segundos,
        u.nombre AS alumno_nombre,
        u.apellido AS alumno_apellido,
        u.usuario AS alumno_usuario,
        u.email AS alumno_email,
        TIMESTAMPDIFF(SECOND, ea.fecha_inicio, ea.fecha_envio) AS tiempo_seg,
        (SELECT COUNT(*) FROM respuestas r WHERE r.evaluacion_alumno_id = ea.id) AS preguntas_respondidas,
        (SELECT COUNT(*) FROM monitoreo_examen e
           WHERE e.evaluacion_alumno_id = ea.id AND e.tipo = 'salida_pagina') AS salidas,
        (SELECT COUNT(*) FROM monitoreo_examen e
           WHERE e.evaluacion_alumno_id = ea.id) AS eventos_totales
     FROM rendiciones ea
     JOIN usuarios u ON u.id = ea.alumno_id
     WHERE ea.evaluacion_id = ?
     ORDER BY ea.nota DESC, u.apellido ASC`,
    [evaluacionId]
  );
  return rows;
}

export async function dificultadPorPregunta(evaluacionId) {
  const [rows] = await pool.query(
    `SELECT
        ep.id AS pregunta_id,
        ep.pregunta,
        ep.tipo,
        ep.orden,
        COUNT(r.id) AS total_respuestas,
        SUM(CASE WHEN r.nota > 0 THEN 1 ELSE 0 END) AS correctas,
        AVG(r.nota) AS promedio_nota
     FROM preguntas_evaluacion ep
     LEFT JOIN respuestas r ON r.evaluacion_pregunta_id = ep.id
     WHERE ep.evaluacion_id = ?
     GROUP BY ep.id
     ORDER BY ep.orden ASC`,
    [evaluacionId]
  );

  return rows.map(r => ({
    ...r,
    total_respuestas: Number(r.total_respuestas) || 0,
    correctas: Number(r.correctas) || 0,
    promedio_nota: Number(r.promedio_nota) || 0,
    porcentaje_acierto: r.total_respuestas > 0
      ? Math.round((r.correctas / r.total_respuestas) * 100)
      : 0,
  }));
}

