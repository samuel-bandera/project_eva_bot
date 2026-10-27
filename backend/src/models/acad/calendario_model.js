import { pool } from '../../config/db.js';
import { aMySQLDatetime } from '../../utils/fechas.js';

export async function listarEventos({
  usuarioId = null, materiaId = null, grupoId = null,
  desde = null, hasta = null, tipo = null, soloPublicos = false
} = {}) {
  const where = [];
  const params = [];

  if (usuarioId) {
    where.push('(c.usuario_id = ? OR c.privado = 0)');
    params.push(usuarioId);
  } else if (soloPublicos) {
    where.push('c.privado = 0');
  }

  if (materiaId) { where.push('c.materia_id = ?'); params.push(materiaId); }
  if (grupoId) { where.push('c.grupo_id = ?'); params.push(grupoId); }
  if (desde) { where.push('c.fecha_inicio >= ?'); params.push(desde); }
  if (hasta) { where.push('c.fecha_inicio <= ?'); params.push(hasta); }
  if (tipo) { where.push('c.tipo = ?'); params.push(tipo); }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT c.*, m.nombre AS materia_nombre, g.nombre AS grupo_nombre, u.nombre AS usuario_nombre
     FROM calendario c
     LEFT JOIN materias m ON m.id = c.materia_id
     LEFT JOIN grupos_principales g ON g.id = c.grupo_id
     LEFT JOIN usuarios u ON u.id = c.usuario_id
     ${whereStr}
     ORDER BY c.fecha_inicio ASC`,
    params
  );
  return rows;
}

export async function obtenerEvento(id) {
  const [rows] = await pool.query('SELECT * FROM calendario WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function crearEvento(conn, { titulo, descripcion, tipo, materiaId, grupoId, usuarioId, fechaInicio, fechaFin, todoElDia, privado, color }) {
  const [result] = await (conn || pool).query(
    `INSERT INTO calendario (titulo, descripcion, tipo, materia_id, grupo_id, usuario_id, fecha_inicio, fecha_fin, todo_el_dia, privado, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [titulo, descripcion, tipo, materiaId, grupoId, usuarioId, aMySQLDatetime(fechaInicio), aMySQLDatetime(fechaFin), todoElDia, privado, color]
  );
  return result.insertId;
}

export async function actualizarEvento(conn, id, datos) {
  const permitidos = ['titulo', 'descripcion', 'tipo', 'fecha_inicio', 'fecha_fin', 'todo_el_dia', 'privado', 'color'];
  const campos = [];
  const valores = [];
  for (const clave of permitidos) {
    if (datos[clave] !== undefined) {
      campos.push(`${clave} = ?`);
      const valor = (clave === 'fecha_inicio' || clave === 'fecha_fin') ? aMySQLDatetime(datos[clave]) : datos[clave];
      valores.push(valor);
    }
  }
  if (campos.length === 0) return;
  valores.push(id);
  await (conn || pool).query(`UPDATE calendario SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function eliminarEvento(conn, id) {
  await (conn || pool).query('DELETE FROM calendario WHERE id = ?', [id]);
}

export async function proximosEventos(usuarioId, limite = 5) {
  const [rows] = await pool.query(
    `SELECT c.* FROM calendario c
     WHERE c.fecha_inicio >= NOW()
       AND (c.privado = FALSE OR c.usuario_id = ?)
     ORDER BY c.fecha_inicio ASC
     LIMIT ?`,
    [usuarioId, limite]
  );
  return rows;
}




export async function listarEventosCompleto({ usuarioId, tipoUsuario = 'alumno', desde = null, hasta = null }) {
  const paramsFechas = [];
  let whereFechas = '';
  if (desde) { whereFechas += ' AND fecha_inicio >= ?'; paramsFechas.push(desde); }
  if (hasta) { whereFechas += ' AND fecha_inicio <= ?'; paramsFechas.push(hasta); }

  const filtroAlumno = (alias) => tipoUsuario === 'alumno'
    ? `AND ${alias}.materia_id IN (SELECT materia_id FROM matriculas WHERE alumno_id = ? AND estado IN ('activa', 'aprobada'))`
    : '';
  const filtroDocente = (alias) => tipoUsuario === 'docente'
    ? `AND ${alias}.materia_id IN (SELECT materia_id FROM materias_docente WHERE docente_id = ?)`
    : '';

  const sql = `
    SELECT * FROM (
      SELECT CONCAT('evento_', c.id) AS id, 'manual' AS origen, c.id AS origen_id, c.titulo, c.descripcion, c.materia_id, mat.nombre AS materia_nombre, c.fecha_inicio, c.fecha_fin, c.todo_el_dia, c.color, NULL AS estado, c.tipo AS tipo
      FROM calendario c
      LEFT JOIN materias mat ON mat.id = c.materia_id
      WHERE (c.privado = 0 OR c.usuario_id = ?)
      UNION ALL
      SELECT CONCAT('eval_', e.id) AS id, 'evaluacion' AS origen, e.id AS origen_id, e.titulo, e.descripcion, e.materia_id, mat.nombre AS materia_nombre, e.fecha_apertura AS fecha_inicio, e.fecha_cierre AS fecha_fin, 0 AS todo_el_dia, CASE WHEN e.tipo='parcial' THEN '#e91e63' WHEN e.tipo='tp' THEN '#ff9800' WHEN e.tipo='final' THEN '#9c27b0' ELSE '#607d8b' END AS color, e.estado, e.tipo
      FROM evaluaciones e
      LEFT JOIN materias mat ON mat.id = e.materia_id
      WHERE e.estado IN ('publicada', 'abierta', 'cerrada')
      ${filtroAlumno('e')}
      ${filtroDocente('e')}
      UNION ALL
      SELECT CONCAT('tarea_', t.id) AS id, 'tarea' AS origen, t.id AS origen_id, t.titulo, t.descripcion, t.materia_id, mat.nombre AS materia_nombre, t.fecha_entrega AS fecha_inicio, NULL AS fecha_fin, 0 AS todo_el_dia, '#ff9800' AS color, t.estado, 'tarea' AS tipo
      FROM tareas t
      LEFT JOIN materias mat ON mat.id = t.materia_id
      WHERE t.estado = 'publicada'
      ${filtroAlumno('t')}
      ${filtroDocente('t')}
      UNION ALL
      SELECT CONCAT('clase_', s.id) AS id, 'clase' AS origen, s.id AS origen_id, CONCAT(m.nombre, ' (', s.aula, ')') AS titulo, 'Clase programada' AS descripcion, s.materia_id, m.nombre AS materia_nombre, CONCAT(s.fecha, ' ', s.hora_inicio) AS fecha_inicio, CONCAT(s.fecha, ' ', s.hora_fin) AS fecha_fin, 0 AS todo_el_dia, m.color AS color, 'programada' AS estado, 'clase' AS tipo
      FROM sesiones_clase s
      JOIN materias m ON m.id = s.materia_id
      WHERE 1=1
      ${filtroAlumno('s')}
      ${filtroDocente('s')}
    ) AS unified
    WHERE 1=1 ${whereFechas}
    ORDER BY fecha_inicio ASC
  `;

  const finalParams = [usuarioId];
  if (tipoUsuario === 'alumno' || tipoUsuario === 'docente') {
    finalParams.push(usuarioId, usuarioId, usuarioId);
  }
  finalParams.push(...paramsFechas);

  const [rows] = await pool.query(sql, finalParams);
  return rows;
}
