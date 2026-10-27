
import { pool } from '../../config/db.js';

export async function buscarUsuarioPorNombre(usuario) {
  const [rows] = await pool.query(
    `SELECT * FROM usuarios WHERE usuario = ? LIMIT 1`,
    [usuario]
  );
  return rows[0] || null;
}

export async function buscarPorIdentificador(identificador) {
  if (!identificador) return null;
  const limpio = String(identificador).trim().toLowerCase();


  const esEmail = limpio.includes('@');
  const campo = esEmail ? 'email' : 'usuario';

  const [rows] = await pool.query(
    `SELECT * FROM usuarios WHERE LOWER(${campo}) = ? LIMIT 1`,
    [limpio]
  );
  return rows[0] || null;
}

export async function buscarUsuarioPorEmail(email) {
  const [rows] = await pool.query(
    `SELECT * FROM usuarios WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function buscarUsuarioPorId(id) {
  const [rows] = await pool.query(
    `SELECT id, nombre, apellido, usuario, email, avatar, tipo, estado,
            email_verificado, activo, debe_cambiar_pass, ultimo_login, creado_en
     FROM usuarios WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function listarUsuarios({ tipo = null, estado = null, activo = null, limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (tipo)   { where.push('tipo = ?');   params.push(tipo); }
  if (estado) { where.push('estado = ?'); params.push(estado); }
  if (activo !== null) { where.push('activo = ?'); params.push(activo); }

  const sql = `
    SELECT id, nombre, apellido, usuario, email, avatar, tipo, estado,
           activo, ultimo_login, creado_en
    FROM usuarios
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY apellido ASC, nombre ASC
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function contarUsuarios({ tipo = null, estado = null } = {}) {
  const where = [];
  const params = [];
  if (tipo)   { where.push('tipo = ?');   params.push(tipo); }
  if (estado) { where.push('estado = ?'); params.push(estado); }

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
    params
  );
  return rows[0].total;
}

export async function crearUsuario(conn, {
  nombre, apellido, usuario, email, contrasena,
  tipo = 'alumno', estado = 'pendiente', activo = true
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO usuarios
       (nombre, apellido, usuario, email, contrasena, tipo, estado, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido, usuario, email, contrasena, tipo, estado, activo]
  );
  return result.insertId;
}

export async function actualizarPassword(conn, usuarioId, nuevoHash, debeCambiar = false) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE usuarios SET contrasena = ?, debe_cambiar_pass = ? WHERE id = ?`,
    [nuevoHash, debeCambiar, usuarioId]
  );
}

export async function actualizarAvatar(conn, usuarioId, avatarPath) {
  const conexion = conn || pool;
  await conexion.query(`UPDATE usuarios SET avatar = ? WHERE id = ?`, [avatarPath, usuarioId]);
}

export async function actualizarUltimoLogin(conn, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(`UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?`, [usuarioId]);
}

export async function sumarIntentoFallido(conn, usuarioId, maxIntentos = 5, minutosBloqueo = 15) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE usuarios
     SET intentos_fallidos = intentos_fallidos + 1,
         bloqueado_hasta = CASE
           WHEN intentos_fallidos + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
           ELSE bloqueado_hasta
         END
     WHERE id = ?`,
    [maxIntentos, minutosBloqueo, usuarioId]
  );
}

export async function resetearIntentosFallidos(conn, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?`,
    [usuarioId]
  );
}

export async function aprobarUsuario(conn, { usuarioId, aprobadoPor }) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE usuarios
     SET estado = 'aprobado', aprobado_por = ?, fecha_aprobacion = NOW()
     WHERE id = ?`,
    [aprobadoPor, usuarioId]
  );
}

export async function rechazarUsuario(conn, { usuarioId, aprobadoPor }) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE usuarios
     SET estado = 'rechazado', aprobado_por = ?, fecha_aprobacion = NOW()
     WHERE id = ?`,
    [aprobadoPor, usuarioId]
  );
}

export async function asignarRol(conn, { usuarioId, rolId, asignadoPor = null }) {
  const conexion = conn || pool;
  await conexion.query(
    `INSERT IGNORE INTO usuario_roles (usuario_id, rol_id, asignado_por)
     VALUES (?, ?, ?)`,
    [usuarioId, rolId, asignadoPor]
  );
}

export async function obtenerRolesDeUsuario(usuarioId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.nombre, r.descripcion
     FROM usuario_roles ur
     JOIN roles r ON r.id = ur.rol_id
     WHERE ur.usuario_id = ?`,
    [usuarioId]
  );
  return rows;
}

export async function quitarRol(conn, usuarioId, rolId) {
  const conexion = conn || pool;
  await conexion.query(
    `DELETE FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?`,
    [usuarioId, rolId]
  );
}

export async function obtenerPermisosDeUsuario(usuarioId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.nombre, p.modulo
     FROM usuario_roles ur
     JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
     JOIN permisos p      ON p.id = rp.permiso_id
     WHERE ur.usuario_id = ?
     UNION
     SELECT pe.permiso AS nombre, NULL AS modulo
     FROM permisos_especiales pe
     WHERE pe.usuario_id = ?
       AND (pe.fecha_expiracion IS NULL OR pe.fecha_expiracion > NOW())`,
    [usuarioId, usuarioId]
  );
  return rows;
}

export async function tienePermiso(usuarioId, permiso) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM usuario_roles ur
     JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
     JOIN permisos p      ON p.id = rp.permiso_id
     WHERE ur.usuario_id = ? AND p.nombre = ?
     UNION
     SELECT 1 FROM permisos_especiales
     WHERE usuario_id = ? AND permiso = ?
       AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
     LIMIT 1`,
    [usuarioId, permiso, usuarioId, permiso]
  );
  return rows.length > 0;
}



export async function buscarAlumnos({ q = '', excluirMateriaId = null, limit = 20 } = {}) {
  const where = [`tipo = 'alumno'`, `estado = 'aprobado'`, `activo = TRUE`];
  const params = [];

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    where.push('(nombre LIKE ? OR apellido LIKE ? OR usuario LIKE ? OR email LIKE ?)');
    params.push(term, term, term, term);
  }

  let sql = `SELECT id, nombre, apellido, usuario, email, avatar
             FROM usuarios
             WHERE ${where.join(' AND ')}`;

  if (excluirMateriaId) {
    sql += ` AND id NOT IN (
               SELECT alumno_id FROM matriculas WHERE materia_id = ?
             )`;
    params.push(excluirMateriaId);
  }

  sql += ` ORDER BY apellido, nombre LIMIT ?`;
  params.push(Number(limit));

  const [rows] = await pool.query(sql, params);
  return rows;
}



export async function obtenerPreferencias(usuarioId) {
  const [rows] = await pool.query(
    'SELECT preferencias FROM usuarios WHERE id = ?',
    [usuarioId]
  );
  if (!rows.length) return null;
  let prefs = rows[0].preferencias;
  if (typeof prefs === 'string') {
    try { prefs = JSON.parse(prefs); } catch { prefs = null; }
  }
  return prefs || {};
}

export async function actualizarPreferencias(usuarioId, preferencias) {
  await pool.query(
    'UPDATE usuarios SET preferencias = ? WHERE id = ?',
    [JSON.stringify(preferencias), usuarioId]
  );
  return preferencias;
}
