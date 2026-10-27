
import { pool } from '../../config/db.js';

export async function listarMatriculasDeAlumno(alumnoId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT m.*,
            mat.nombre AS materia_nombre,
            mat.codigo AS materia_codigo,
            mat.color AS materia_color,
            mat.descripcion AS materia_descripcion,
            (SELECT COUNT(*) FROM tareas t WHERE t.materia_id = m.materia_id AND t.estado = 'publicada') AS total_tareas,
            (SELECT COUNT(*) FROM materiales ma WHERE ma.materia_id = m.materia_id) AS total_materiales
     FROM matriculas m
     JOIN materias mat ON mat.id = m.materia_id
     WHERE m.alumno_id = ?
     ORDER BY mat.nombre ASC
     LIMIT ? OFFSET ?`,
    [alumnoId, limit, offset]
  );
  return rows;
}

export async function contarMatriculasDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM matriculas WHERE alumno_id = ?`,
    [alumnoId]
  );
  return rows[0].total;
}

export async function listarMatriculasDeProfesor(profesorId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT m.*, mat.nombre AS materia_nombre, mat.codigo AS materia_codigo,
            u.nombre AS alumno_nombre, u.apellido AS alumno_apellido,
            u.email  AS alumno_email
     FROM matriculas m
     JOIN materias mat         ON mat.id = m.materia_id
     JOIN usuarios u           ON u.id   = m.alumno_id
     JOIN materias_docente mp ON mp.materia_id = m.materia_id
     WHERE mp.docente_id = ?
     ORDER BY mat.nombre ASC, u.apellido ASC
     LIMIT ? OFFSET ?`,
    [profesorId, limit, offset]
  );
  return rows;
}

export async function contarMatriculasDeProfesor(profesorId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT m.id) AS total
     FROM matriculas m
     JOIN materias_docente mp ON mp.materia_id = m.materia_id
     WHERE mp.docente_id = ?`,
    [profesorId]
  );
  return rows[0].total;
}

export async function listarTodasLasMatriculas({ limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT m.*, mat.nombre AS materia_nombre,
            u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
     FROM matriculas m
     JOIN materias mat ON mat.id = m.materia_id
     JOIN usuarios u   ON u.id   = m.alumno_id
     ORDER BY mat.nombre ASC, u.apellido ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

export async function materiaExiste(materiaId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM materias WHERE id = ? AND activa = TRUE`,
    [materiaId]
  );
  return rows.length > 0;
}

export async function estaMatriculado(conn, alumnoId, materiaId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT 1 FROM matriculas
     WHERE alumno_id = ? AND materia_id = ?
       AND estado IN ('activa','aprobada')`,
    [alumnoId, materiaId]
  );
  return rows.length > 0;
}

export async function profesorDictaMateria(conn, profesorId, materiaId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT 1 FROM materias_docente WHERE materia_id = ? AND docente_id = ?`,
    [materiaId, profesorId]
  );
  return rows.length > 0;
}

export async function esAlumno(conn, usuarioId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT 1 FROM usuarios WHERE id = ? AND tipo = 'alumno' AND activo = TRUE`,
    [usuarioId]
  );
  return rows.length > 0;
}

export async function obtenerProfesoresDeMateria(conn, materiaId) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(
    `SELECT docente_id FROM materias_docente WHERE materia_id = ?`,
    [materiaId]
  );
  return rows;
}

export async function crearMatricula(conn, {
  alumnoId, materiaId, origen = 'solicitud', creadoPor, tipoCreador,
  aprobadaPor = null, fechaAprobacion = null, observacion = null
}) {
  const conexion = conn || pool;
  const aprobada = aprobadaPor ?? creadoPor;
  const fechaAp = fechaAprobacion ? new Date(fechaAprobacion) : (aprobada ? new Date() : null);

  const [result] = await conexion.query(
    `INSERT INTO matriculas
       (alumno_id, materia_id, estado, origen, creada_por, tipo_creador,
        aprobada_por, fecha_aprobacion, observacion)
     VALUES (?, ?, 'activa', ?, ?, ?, ?, ?, ?)`,
    [alumnoId, materiaId, origen, creadoPor, tipoCreador, aprobada, fechaAp, observacion]
  );
  return result.insertId;
}

export async function crearMatriculasMasivo(conn, filas) {
  const conexion = conn || pool;
  if (!filas.length) return 0;
  const ahora = new Date();
  const values = filas.map(f => [
    f[0], f[1], 'activa', f[2], f[3], f[4], f[3], ahora, null
  ]);
  const [result] = await conexion.query(
    `INSERT INTO matriculas
       (alumno_id, materia_id, estado, origen, creada_por, tipo_creador,
        aprobada_por, fecha_aprobacion, observacion)
     VALUES ?`,
    [values]
  );
  return result.affectedRows;
}

export async function obtenerMatriculaPorId(conn, id) {
  const conexion = conn || pool;
  const [rows] = await conexion.query(`SELECT * FROM matriculas WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function cancelarMatricula(conn, id, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE matriculas
     SET estado = 'abandonada',
         observacion = CONCAT(COALESCE(observacion,''), ' | Cancelada por usuario ', ?)
     WHERE id = ?`,
    [usuarioId, id]
  );
}

export async function alumnosValidos(conn, ids) {
  const conexion = conn || pool;
  if (!ids || ids.length === 0) return [];
  const [rows] = await conexion.query(
    `SELECT id FROM usuarios WHERE id IN (?) AND tipo = 'alumno' AND activo = TRUE`,
    [ids]
  );
  return rows.map(r => r.id);
}

export async function alumnosYaMatriculados(conn, materiaId, ids) {
  const conexion = conn || pool;
  if (!ids || ids.length === 0) return [];
  const [rows] = await conexion.query(
    `SELECT alumno_id FROM matriculas
     WHERE materia_id = ? AND alumno_id IN (?)
       AND estado IN ('activa','aprobada')`,
    [materiaId, ids]
  );
  return rows.map(r => r.alumno_id);
}

export async function registrarAprobacion(conn, {
  alumnoId, materiaId, aprobadoPor, tipoAprobador, observacion = null
}) {
  await conn.query(
    `INSERT INTO aprobaciones_materia
       (alumno_id, materia_id, aprobado_por, tipo_aprobador, estado, observacion)
     VALUES (?, ?, ?, ?, 'aprobado', ?)
     ON DUPLICATE KEY UPDATE
       aprobado_por   = VALUES(aprobado_por),
       tipo_aprobador = VALUES(tipo_aprobador),
       estado         = 'aprobado',
       observacion    = VALUES(observacion),
       fecha          = NOW()`,
    [alumnoId, materiaId, aprobadoPor, tipoAprobador, observacion]
  );
}

export async function crearNotificacion(conn, {
  usuarioId, titulo, mensaje, tipo = 'info', url = null
}) {
  const conexion = conn || pool;
  await conexion.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, titulo, mensaje, tipo, url]
  );
}

export async function crearNotificacionesMasivo(conn, filas) {
  const conexion = conn || pool;
  if (!filas.length) return;
  await conexion.query(
    `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url) VALUES ?`,
    [filas]
  );
}

export async function listarPorMateria(materiaId, { limit = 100, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT m.id, m.alumno_id, m.materia_id, m.estado, m.nota_final, m.fecha,
            u.nombre, u.apellido, u.usuario, u.email, u.avatar,
            u.estado AS alumno_estado
     FROM matriculas m
     JOIN usuarios u ON u.id = m.alumno_id
     WHERE m.materia_id = ?
       AND m.estado IN ('activa', 'aprobada')
     ORDER BY u.apellido ASC, u.nombre ASC
     LIMIT ? OFFSET ?`,
    [materiaId, limit, offset]
  );
  return rows;
}

export async function contarPorMateria(materiaId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM matriculas m
     WHERE m.materia_id = ?
       AND m.estado IN ('activa', 'aprobada')`,
    [materiaId]
  );
  return rows[0]?.total || 0;
}


export async function listarAlumnosConNotas(materiaId) {
  const [rows] = await pool.query(
    `SELECT m.id AS matricula_id, m.nota_final, m.observacion, m.estado,
            u.id AS alumno_id, u.nombre, u.apellido, u.usuario, u.email
     FROM matriculas m
     JOIN usuarios u ON u.id = m.alumno_id
     WHERE m.materia_id = ?
     ORDER BY u.apellido ASC, u.nombre ASC`,
    [materiaId]
  );
  return rows;
}

export async function actualizarNotaFinal(conn, matriculaId, notaFinal, observacion) {
  const c = conn || pool;
  await c.query(
    `UPDATE matriculas SET nota_final = ?, observacion = ? WHERE id = ?`,
    [notaFinal, observacion, matriculaId]
  );
}
