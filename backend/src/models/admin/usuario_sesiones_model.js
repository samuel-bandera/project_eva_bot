import { pool } from '../../config/db.js';

export async function buscarSesionActiva(tokenHash) {
  const [rows] = await pool.query(
    `SELECT * FROM sesiones_usuarios
     WHERE token_hash = ? AND revocada = FALSE AND fecha_expiracion > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}



export async function crearSesion(conn, {
  usuarioId, tokenHash, ip, userAgent, dispositivo, fechaExpiracion
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO sesiones_usuarios
       (usuario_id, token_hash, ip, user_agent, dispositivo, fecha_expiracion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, tokenHash, ip, userAgent, dispositivo, fechaExpiracion]
  );
  return result.insertId;
}

export async function revocarSesion(conn, tokenHash, motivo = 'logout') {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE sesiones_usuarios
     SET revocada = TRUE, motivo_revocacion = ?, fecha_revocacion = NOW()
     WHERE token_hash = ?`,
    [motivo, tokenHash]
  );
}

export async function revocarTodasLasSesiones(conn, usuarioId, motivo = 'cambio_password') {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE sesiones_usuarios
     SET revocada = TRUE, motivo_revocacion = ?, fecha_revocacion = NOW()
     WHERE usuario_id = ? AND revocada = FALSE`,
    [motivo, usuarioId]
  );
}

export async function registrarIntentoLogin(conn, {
  usuario, exitoso, ip = null, userAgent = null
}) {
  const conexion = conn || pool;
  await conexion.query(
    `INSERT INTO intentos_login (usuario, exitoso, ip, user_agent)
     VALUES (?, ?, ?, ?)`,
    [usuario, exitoso, ip, userAgent]
  );
}

