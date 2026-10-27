
import { pool } from '../../config/db.js';


async function generarCodigoPublico(materiaId, modelo) {
  const [mats] = await pool.query(
    'SELECT abreviatura, codigo, nombre FROM materias WHERE id = ?',
    [materiaId]
  );
  const m = mats[0] || {};
  let abbr = (m.abreviatura || '').toUpperCase().trim();
  if (!abbr && m.codigo) {
    abbr = String(m.codigo).toUpperCase().replace(/[0-9]/g, '').slice(0, 3);
  }
  if (!abbr) abbr = 'GEN';
  abbr = abbr.padEnd(2, 'X').slice(0, 4);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];

  return `${abbr}-M${modelo || 1}-${rand}`;
}

export async function generarCodigoDespuesDeInsert(evaluacionId) {
  const [ev] = await pool.query(
    'SELECT id, modelo, materia_id FROM evaluaciones WHERE id = ?',
    [evaluacionId]
  );
  if (!ev.length) return null;
  const codigo = await generarCodigoPublico(ev[0].materia_id, ev[0].modelo || 1);
  await pool.query('UPDATE evaluaciones SET codigo_publico = ? WHERE id = ?', [codigo, evaluacionId]);
  return codigo;
}

export async function listarEvaluacionesDeProfesor(profesorId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT e.*,
            m.nombre AS materia_nombre, m.codigo AS materia_codigo,
            (SELECT COUNT(*) FROM rendiciones ea
             WHERE ea.evaluacion_id = e.id) AS total_rendiciones,
            (SELECT COUNT(*) FROM rendiciones ea
             WHERE ea.evaluacion_id = e.id AND ea.estado = 'corregida') AS total_corregidas
     FROM evaluaciones e
     JOIN materias m ON m.id = e.materia_id
     WHERE e.docente_id = ?
     ORDER BY e.fecha_apertura DESC
     LIMIT ? OFFSET ?`,
    [profesorId, limit, offset]
  );
  return rows;
}

export async function listarEvaluacionesDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT e.*,
       u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
       m.nombre AS materia_nombre, m.codigo AS materia_codigo,
       r.id          AS rendicion_id,
       r.estado      AS estado_rendicion,
       r.nota        AS nota,
       r.intento     AS intento,
       r.fecha_inicio AS ultima_rendicion_fecha_inicio,
       r.pendiente_autorizacion AS pendiente_autorizacion,
       (SELECT COUNT(*) FROM rendiciones WHERE evaluacion_id = e.id AND alumno_id = ?) AS intentos_usados,
       (SELECT MAX(r2.intento) FROM rendiciones r2 WHERE r2.evaluacion_id = e.id AND r2.alumno_id = ?) AS max_intento
     FROM evaluaciones e
     JOIN usuarios u ON u.id = e.docente_id
     JOIN materias m ON m.id = e.materia_id
     LEFT JOIN rendiciones r ON r.id = (
       SELECT r2.id FROM rendiciones r2
       WHERE r2.evaluacion_id = e.id AND r2.alumno_id = ?
       ORDER BY r2.intento DESC LIMIT 1
     )
     WHERE e.estado IN ('publicada', 'abierta', 'cerrada')
     ORDER BY e.fecha_apertura DESC`,
    [alumnoId, alumnoId, alumnoId]
  );

  return rows.map((e) => {
    const duracionSeg = (Number(e.duracion_minutos) || 0) * 60;
    const enProgreso = e.estado_rendicion === 'en_progreso' && e.ultima_rendicion_fecha_inicio;
    let tiempoRestanteSeg = null;
    if (enProgreso) {
      const inicio = new Date(e.ultima_rendicion_fecha_inicio).getTime();
      const ahora = Date.now();
      const transcurrido = Math.floor((ahora - inicio) / 1000);
      tiempoRestanteSeg = Math.max(0, duracionSeg - transcurrido);
    }
    return {
      ...e,
      intentos_usados: Number(e.intentos_usados) || 0,
      max_intento: Number(e.max_intento) || 0,
      intentos_permitidos: Number(e.intentos_permitidos) || 1,
      tiempo_restante_segundos: tiempoRestanteSeg,
    };
  });
}

export async function obtenerEvaluacion(id) {
  const [ev] = await pool.query(
    `SELECT e.*,
            u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
            m.nombre AS materia_nombre, m.codigo AS materia_codigo
     FROM evaluaciones e
     JOIN usuarios u ON u.id = e.docente_id
     JOIN materias m ON m.id = e.materia_id
     WHERE e.id = ?`,
    [id]
  );
  if (!ev[0]) return null;

  const [preguntas] = await pool.query(
    `SELECT id, banco_pregunta_id, pregunta, respuesta_correcta, orden, puntaje, tipo, opciones
     FROM preguntas_evaluacion
     WHERE evaluacion_id = ?
     ORDER BY orden ASC, id ASC`,
    [id]
  );

  return { ...ev[0], preguntas };
}


export async function crearEvaluacion(conn, {
  titulo, descripcion = null, profesorId, materiaId, cicloId = null,
  tipo = 'parcial', fechaPublicacion, fechaApertura, fechaCierre,
  duracionMinutos = null, intentosPermitidos = 1, notaMaxima = 10.00,
  tipoCorreccion = 'manual',
  bloquearSalida = false, monitoreoEnVivo = true,
  mostrarTiempo = true, permitirExtension = true,
  preguntas = [], grupos = []
}) {
  const [result] = await (conn || pool).query(
    `INSERT INTO evaluaciones
       (titulo, descripcion, docente_id, materia_id, ciclo_id, tipo,
        fecha_publicacion, fecha_apertura, fecha_cierre,
        duracion_minutos, intentos_permitidos, nota_maxima, tipo_correccion, estado,
        bloquear_salida, monitoreo_en_vivo, mostrar_tiempo, permitir_extension)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?)`,
    [titulo, descripcion, profesorId, materiaId, cicloId, tipo,
     fechaPublicacion, fechaApertura, fechaCierre,
     duracionMinutos, intentosPermitidos, notaMaxima, tipoCorreccion,
     bloquearSalida, monitoreoEnVivo, mostrarTiempo, permitirExtension]
  );
  const evaluacionId = result.insertId;

  if (preguntas.length) {
    const values = preguntas.map((p, i) => [
      evaluacionId,
      p.bancoPreguntaId || null,
      p.pregunta,
      p.respuesta_correcta,
      p.orden ?? i + 1,
      p.puntaje ?? 1.00,
      p.tipo || 'short_answer',
      p.opciones ? JSON.stringify(p.opciones) : null
    ]);
    await (conn || pool).query(
      `INSERT INTO preguntas_evaluacion
         (evaluacion_id, banco_pregunta_id, pregunta, respuesta_correcta, orden, puntaje, tipo, opciones)
       VALUES ?`,
      [values]
    );
  }

    if (grupos && grupos.length > 0) {
      for (const grupoId of grupos) {
        await (conn || pool).query(
          `INSERT INTO evaluaciones_destinatarios (evaluacion_id, grupo_id, alcance) VALUES (?, ?, 'grupo')`,
          [evaluacionId, grupoId]
        );
      }
    }

  return evaluacionId;
}

export async function actualizarEstadoEvaluacion(conn, evaluacionId, estado) {
  await (conn || pool).query(
    `UPDATE evaluaciones SET estado = ? WHERE id = ?`,
    [estado, evaluacionId]
  );
}

export async function publicarEvaluacion(conn, evaluacionId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE evaluaciones
     SET estado = 'publicada', fecha_publicacion = NOW()
     WHERE id = ?`,
    [evaluacionId]
  );
}

export async function despublicarEvaluacion(conn, evaluacionId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE evaluaciones SET estado = 'borrador' WHERE id = ?`,
    [evaluacionId]
  );
}

export async function abrirEvaluacion(conn, evaluacionId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE evaluaciones SET estado = 'abierta' WHERE id = ?`,
    [evaluacionId]
  );
}

export async function cerrarEvaluacion(conn, evaluacionId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE evaluaciones SET estado = 'cerrada' WHERE id = ?`,
    [evaluacionId]
  );
}

export * from './evaluacion_rendicion_model.js';
export * from './evaluacion_correccion_model.js';
export * from './evaluacion_reclamos_model.js';
export * from './evaluacion_en_vivo_model.js';
export * from './evaluacion_estadisticas_model.js';

export async function agregarPreguntaEvaluacion(conn, evaluacionId, p) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO preguntas_evaluacion
       (evaluacion_id, banco_pregunta_id, pregunta, respuesta_correcta, orden, puntaje, tipo, opciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      evaluacionId,
      p.banco_pregunta_id || null,
      p.pregunta,
      p.respuesta_correcta,
      p.orden ?? 0,
      p.puntaje ?? 1.00,
      p.tipo || 'short_answer',
      p.opciones ? JSON.stringify(p.opciones) : null
    ]
  );
  const [rows] = await conexion.query(
    `SELECT id, evaluacion_id, banco_pregunta_id, pregunta, respuesta_correcta,
            orden, puntaje, tipo, opciones
     FROM preguntas_evaluacion WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}
