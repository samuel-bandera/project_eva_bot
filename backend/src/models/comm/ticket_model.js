import { pool } from '../../config/db.js';

export async function crear(conn, { alumnoId, destinatario, profesorId, materiaId, asunto, descripcion, prioridad }) {
  const c = conn || pool;
  const [result] = await c.query(
    `INSERT INTO tickets (alumno_id, destinatario, docente_id, materia_id, asunto, descripcion, prioridad)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [alumnoId, destinatario, profesorId || null, materiaId || null, asunto, descripcion, prioridad || 'media']
  );
  return result.insertId;
}

export async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT t.*,
            a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.email AS alumno_email, a.usuario AS alumno_usuario,
            p.nombre AS profesor_nombre, p.apellido AS profesor_apellido,
            m.nombre AS materia_nombre, m.codigo AS materia_codigo
     FROM tickets t
     JOIN usuarios a ON a.id = t.alumno_id
     LEFT JOIN usuarios p ON p.id = t.docente_id
     LEFT JOIN materias m ON m.id = t.materia_id
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function listarDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT t.*,
            m.nombre AS materia_nombre,
            p.nombre AS profesor_nombre, p.apellido AS profesor_apellido,
            (SELECT COUNT(*) FROM tickets_respuestas WHERE ticket_id = t.id) AS num_respuestas
     FROM tickets t
     LEFT JOIN materias m ON m.id = t.materia_id
     LEFT JOIN usuarios p ON p.id = t.docente_id
     WHERE t.alumno_id = ?
     ORDER BY t.creado_en DESC`,
    [alumnoId]
  );
  return rows;
}

export async function listarParaProfesor(profesorId) {
  const [rows] = await pool.query(
    `SELECT t.*,
            a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.email AS alumno_email,
            m.nombre AS materia_nombre,
            (SELECT COUNT(*) FROM tickets_respuestas WHERE ticket_id = t.id) AS num_respuestas
     FROM tickets t
     JOIN usuarios a ON a.id = t.alumno_id
     LEFT JOIN materias m ON m.id = t.materia_id
     WHERE t.destinatario = 'docente' AND t.docente_id = ?
     ORDER BY FIELD(t.estado, 'abierto', 'en_proceso', 'resuelto', 'cerrado'), t.creado_en DESC`,
    [profesorId]
  );
  return rows;
}

export async function listarTodos({ estado = null } = {}) {
  let sql = `
    SELECT t.*,
           a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.email AS alumno_email,
           p.nombre AS profesor_nombre, p.apellido AS profesor_apellido,
           m.nombre AS materia_nombre,
           (SELECT COUNT(*) FROM tickets_respuestas WHERE ticket_id = t.id) AS num_respuestas
    FROM tickets t
    JOIN usuarios a ON a.id = t.alumno_id
    LEFT JOIN usuarios p ON p.id = t.docente_id
    LEFT JOIN materias m ON m.id = t.materia_id
    WHERE 1=1`;
  const params = [];
  if (estado) {
    sql += ' AND t.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY FIELD(t.estado, \'abierto\', \'en_proceso\', \'resuelto\', \'cerrado\'), t.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function listarRespuestas(ticketId) {
  const [rows] = await pool.query(
    `SELECT r.*,
            u.nombre AS autor_nombre, u.apellido AS autor_apellido
     FROM tickets_respuestas r
     JOIN usuarios u ON u.id = r.autor_id
     WHERE r.ticket_id = ?
     ORDER BY r.creado_en ASC`,
    [ticketId]
  );
  return rows;
}

export async function agregarRespuesta(conn, { ticketId, autorId, autorTipo, mensaje }) {
  const c = conn || pool;
  const [result] = await c.query(
    `INSERT INTO tickets_respuestas (ticket_id, autor_id, autor_tipo, mensaje)
     VALUES (?, ?, ?, ?)`,
    [ticketId, autorId, autorTipo, mensaje]
  );
  return result.insertId;
}

export async function cambiarEstado(conn, ticketId, estado) {
  const c = conn || pool;
  await c.query('UPDATE tickets SET estado = ? WHERE id = ?', [estado, ticketId]);
}

export async function contarPorEstado() {
  const [rows] = await pool.query(
    `SELECT estado, COUNT(*) AS total FROM tickets GROUP BY estado`
  );
  return rows;
}
