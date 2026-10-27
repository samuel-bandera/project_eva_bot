import { pool } from '../../config/db.js';

export async function corregirRendicion(conn, { rendicionId, nota, motivoRechazo = null }) {
  await (conn || pool).query(
    `UPDATE rendiciones
     SET estado = 'corregida', nota = ?, motivo_rechazo = ?
     WHERE id = ?`,
    [nota, motivoRechazo, rendicionId]
  );
}

export async function registrarCambioNota(conn, {
  alumnoId, evaluacionAlumnoId = null, tareaId = null, materiaId = null,
  tipoCalificacion, notaAnterior, notaNueva, modificadoPor, rolModificador,
  motivo, origen
}) {
  await (conn || pool).query(
    `INSERT INTO historial_cambios_notas
       (alumno_id, evaluacion_alumno_id, tarea_id, materia_id, tipo_calificacion,
        nota_anterior, nota_nueva, modificado_por, rol_modificador, motivo, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [alumnoId, evaluacionAlumnoId, tareaId, materiaId, tipoCalificacion,
     notaAnterior, notaNueva, modificadoPor, rolModificador, motivo, origen]
  );
}

export async function asignarModelo(rendicionId, modelo) {
  await pool.query(
    'UPDATE rendiciones SET modelo_asignado = ? WHERE id = ?',
    [modelo, rendicionId]
  );
}

export async function calcularNotaAutomatica(rendicionId) {
  const iaService = await import('../../services/ia_service.js');

  const [baseRows] = await pool.query(
    `SELECT r.evaluacion_id, e.nota_maxima
     FROM rendiciones r JOIN evaluaciones e ON e.id = r.evaluacion_id
     WHERE r.id = ?`,
    [rendicionId]
  );
  if (!baseRows.length) {
    return { nota: 0, notaMaxima: 10, sumaCorrectos: 0, sumaTotal: 0, totalPreguntas: 0, totalRespondidas: 0 };
  }
  const { evaluacion_id: evaluacionId, nota_maxima: notaMaxima } = baseRows[0];
  const nm = Number(notaMaxima) || 10;

  const [preguntas] = await pool.query(
    `SELECT ep.id AS pregunta_id, ep.pregunta, ep.respuesta_correcta, ep.tipo, ep.puntaje,
            r.id AS respuesta_id, r.respuesta
     FROM preguntas_evaluacion ep
     LEFT JOIN respuestas r ON r.evaluacion_pregunta_id = ep.id
                            AND r.evaluacion_alumno_id = ?
     WHERE ep.evaluacion_id = ?
     ORDER BY ep.orden ASC`,
    [rendicionId, evaluacionId]
  );

  let sumaCorrectos = 0;
  let sumaTotal = 0;
  let totalRespondidas = 0;
  const detallePorPregunta = [];

  for (const p of preguntas) {
    const puntajeMax = Number(p.puntaje) || 1;
    sumaTotal += puntajeMax;
    const respuestaAlumno = (p.respuesta || '').trim();
    if (respuestaAlumno) totalRespondidas++;

    let puntajeObtenido = 0;
    let correcta = false;
    let correccion = null;

    if (p.tipo === 'short_answer') {
      const res = await iaService.corregirRespuestaAbierta({
        pregunta: p.pregunta,
        respuestaCorrecta: p.respuesta_correcta,
        respuestaAlumno,
        puntajeMaximo: puntajeMax,
      });
      correcta = res.correcta;
      puntajeObtenido = res.puntaje;
      correccion = {
        correcta: res.correcta,
        puntaje: res.puntaje,
        puntajeMaximo: res.puntajeMaximo,
        feedback_alumno: res.feedbackAlumno,
        feedback_docente: res.feedbackDocente,
        conceptos_clave: res.conceptosClave || [],
        fallback: res.fallback || false,
        proveedor: res.proveedor || (res.fallback ? 'fallback' : 'ia'),
      };
      if (p.respuesta_id) {
        await pool.query(
          'UPDATE respuestas SET correccion_ia = ?, nota = ? WHERE id = ?',
          [JSON.stringify(correccion), puntajeObtenido, p.respuesta_id]
        );
      }
    } else {
      correcta = String(respuestaAlumno).trim() === String(p.respuesta_correcta || '').trim();
      puntajeObtenido = correcta ? puntajeMax : 0;
    }

    sumaCorrectos += puntajeObtenido;
    detallePorPregunta.push({
      pregunta_id: p.pregunta_id,
      pregunta: p.pregunta,
      tipo: p.tipo,
      correcta,
      puntaje_obtenido: puntajeObtenido,
      puntaje_maximo: puntajeMax,
      correccion,
    });
  }

  const nota = sumaTotal > 0 ? Number(((sumaCorrectos / sumaTotal) * nm).toFixed(2)) : 0;
  await pool.query(
    "UPDATE rendiciones SET nota = ?, estado = 'corregida' WHERE id = ?",
    [nota, rendicionId]
  );

  return {
    nota,
    notaMaxima: nm,
    sumaCorrectos,
    sumaTotal,
    totalPreguntas: preguntas.length,
    totalRespondidas,
    detalle: detallePorPregunta,
  };
}

