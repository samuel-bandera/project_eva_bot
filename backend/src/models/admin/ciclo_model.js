
import { pool } from '../../config/db.js';

export async function listarCiclos({ activo = null } = {}) {
  const params = [];
  let sql = `SELECT * FROM ciclos_electivos`;
  if (activo !== null) { sql += ' WHERE activo = ?'; params.push(activo); }
  sql += ' ORDER BY fecha_inicio DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function obtenerCiclo(id) {
  const [rows] = await pool.query(`SELECT * FROM ciclos_electivos WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function obtenerCicloActivo() {
  const [rows] = await pool.query(
    `SELECT * FROM ciclos_electivos WHERE activo = TRUE ORDER BY fecha_inicio DESC LIMIT 1`
  );
  return rows[0] || null;
}

export async function crearCiclo(conn, { nombre, fechaInicio, fechaFin, activo = false }) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO ciclos_electivos (nombre, fecha_inicio, fecha_fin, activo)
     VALUES (?, ?, ?, ?)`,
    [nombre, fechaInicio, fechaFin, activo]
  );
  return result.insertId;
}

export async function actualizarCiclo(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['nombre', 'fecha_inicio', 'fecha_fin', 'activo'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE ciclos_electivos SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function desactivarOtrosCiclos(conn, exceptoId) {
  await conn.query(
    `UPDATE ciclos_electivos SET activo = FALSE WHERE id <> ?`,
    [exceptoId]
  );
}

