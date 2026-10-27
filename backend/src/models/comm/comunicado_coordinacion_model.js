import { pool } from '../../config/db.js';

export async function listarRecibidos(usuarioId) {
  const [filas] = await pool.query(
    `SELECT DISTINCT cc.*, u.nombre AS emisor_nombre, u.apellido AS emisor_apellido,
      (SELECT 1 FROM comunicados_coordinacion_lecturas l
        WHERE l.comunicado_id = cc.id AND l.usuario_id = ?) AS leido,
      (SELECT GROUP_CONCAT(DISTINCT cd.tipo ORDER BY cd.tipo)
        FROM comunicados_destinatarios cd WHERE cd.comunicado_id = cc.id) AS tipos_destinatario
     FROM comunicados_coordinacion cc
     INNER JOIN usuarios u ON u.id = cc.emisor_id
     WHERE cc.activo = 1 AND cc.emisor_id <> ?
       AND cc.id IN (
         SELECT cd.comunicado_id
         FROM comunicados_destinatarios cd
         LEFT JOIN usuarios usr ON usr.id = ?
         LEFT JOIN coordinadores_carrera cco ON cco.coordinador_id = usr.id
         LEFT JOIN matriculas mat ON mat.alumno_id = usr.id
         LEFT JOIN materias m_mat ON m_mat.id = mat.materia_id
         LEFT JOIN materias_docente md ON md.docente_id = usr.id
         LEFT JOIN materias m_doc ON m_doc.id = md.materia_id
         WHERE
           (cd.tipo = 'rol' AND usr.tipo = cd.rol)
           OR (cd.tipo = 'carrera' AND (
             (usr.tipo = 'alumno' AND m_mat.carrera_id = cd.carrera_id)
             OR (usr.tipo = 'docente' AND m_doc.carrera_id = cd.carrera_id)
             OR (usr.tipo = 'coordinador' AND cco.carrera_id = cd.carrera_id)
           ))
           OR (cd.tipo = 'usuario' AND cd.usuario_id = usr.id)
       )
     ORDER BY cc.creado_en DESC LIMIT 200`,
    [usuarioId, usuarioId, usuarioId]
  );
  return filas;
}

export async function listarEnviados(usuarioId) {
  const [filas] = await pool.query(
    `SELECT cc.*,
      (SELECT COUNT(*) FROM comunicados_destinatarios cd WHERE cd.comunicado_id = cc.id) AS total_destinatarios,
      (SELECT GROUP_CONCAT(
        CASE
          WHEN cd.tipo = 'rol' THEN CONCAT('rol:', cd.rol)
          WHEN cd.tipo = 'carrera' THEN CONCAT('carrera:', COALESCE(car.nombre,'?'))
          WHEN cd.tipo = 'usuario' THEN CONCAT('usuario:', COALESCE(usr.nombre,'?'))
        END
        SEPARATOR ', '
      )
      FROM comunicados_destinatarios cd
      LEFT JOIN carreras car ON car.id = cd.carrera_id
      LEFT JOIN usuarios usr ON usr.id = cd.usuario_id
      WHERE cd.comunicado_id = cc.id) AS resumen_destinatarios
     FROM comunicados_coordinacion cc
     WHERE cc.emisor_id = ? AND cc.activo = 1
     ORDER BY cc.creado_en DESC LIMIT 200`,
    [usuarioId]
  );
  return filas;
}

export async function crear({ emisorId, emisorTipo, titulo, contenido, nivelAlerta, enviarEmailTodos = false, destinatarios = [] }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO comunicados_coordinacion
        (emisor_id, emisor_tipo, titulo, contenido, nivel_alerta, enviar_email_todos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [emisorId, emisorTipo, titulo, contenido, nivelAlerta, enviarEmailTodos ? 1 : 0]
    );
    const comunicadoId = r.insertId;
    for (const d of destinatarios) {
      if (d.tipo === 'rol' && d.rol) {
        await conn.query('INSERT INTO comunicados_destinatarios (comunicado_id, tipo, rol) VALUES (?, ?, ?)', [comunicadoId, 'rol', d.rol]);
      } else if (d.tipo === 'carrera' && d.carreraId) {
        await conn.query('INSERT INTO comunicados_destinatarios (comunicado_id, tipo, carrera_id) VALUES (?, ?, ?)', [comunicadoId, 'carrera', d.carreraId]);
      } else if (d.tipo === 'usuario' && d.usuarioId) {
        await conn.query('INSERT INTO comunicados_destinatarios (comunicado_id, tipo, usuario_id) VALUES (?, ?, ?)', [comunicadoId, 'usuario', d.usuarioId]);
      }
    }
    await conn.commit();
    return comunicadoId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function resolverDestinatarios(comunicadoId) {
  const [filas] = await pool.query(
    `SELECT DISTINCT usr.id, usr.nombre, usr.apellido, usr.email, usr.tipo
     FROM comunicados_destinatarios cd
     INNER JOIN usuarios usr ON usr.activo = 1
     LEFT JOIN coordinadores_carrera cco ON cco.coordinador_id = usr.id
     LEFT JOIN matriculas mat ON mat.alumno_id = usr.id
     LEFT JOIN materias m_mat ON m_mat.id = mat.materia_id
     LEFT JOIN materias_docente md ON md.docente_id = usr.id
     LEFT JOIN materias m_doc ON m_doc.id = md.materia_id
     WHERE cd.comunicado_id = ?
       AND (
         (cd.tipo = 'rol' AND usr.tipo = cd.rol)
         OR (cd.tipo = 'carrera' AND (
           (usr.tipo = 'alumno' AND m_mat.carrera_id = cd.carrera_id)
           OR (usr.tipo = 'docente' AND m_doc.carrera_id = cd.carrera_id)
           OR (usr.tipo = 'coordinador' AND cco.carrera_id = cd.carrera_id)
         ))
         OR (cd.tipo = 'usuario' AND usr.id = cd.usuario_id)
       )`,
    [comunicadoId]
  );
  return filas;
}

export async function marcarLeido(comunicadoId, usuarioId) {
  await pool.query(
    'INSERT IGNORE INTO comunicados_coordinacion_lecturas (comunicado_id, usuario_id) VALUES (?, ?)',
    [comunicadoId, usuarioId]
  );
}
