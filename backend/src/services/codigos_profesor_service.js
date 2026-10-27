

import { pool } from '../config/db.js';

const DIAS_VALIDEZ = 90;

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bloque = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };
  return `PROF-${bloque()}-${bloque()}`;
}


export async function generarCodigoInvitacion(creadoPor, motivo = null) {
  let codigo;
  let intentos = 0;

  while (intentos < 10) {
    codigo = generarCodigo();
    try {
      const [result] = await pool.query(
        `INSERT INTO codigos_invitacion_docente
           (codigo, creado_por, expira_en, motivo)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?)`,
        [codigo, creadoPor, DIAS_VALIDEZ, motivo]
      );

      const [filasExp] = await pool.query(
        'SELECT expira_en FROM codigos_invitacion_docente WHERE id = ?',
        [result.insertId]
      );

      return {
        id: result.insertId,
        codigo,
        expiraEn: filasExp[0]?.expira_en ?? null,
        diasValidez: DIAS_VALIDEZ,
      };
    } catch (e) {
      if (!e.code || e.code !== 'ER_DUP_ENTRY') throw e;
      intentos++;
    }
  }

  throw new Error('No se pudo generar un código único después de varios intentos');
}

export async function validarCodigo(codigo) {
  if (!codigo) return { valido: false, error: 'Código vacío' };

  const codigoLimpio = String(codigo).trim().toUpperCase();

  const [rows] = await pool.query(
    `SELECT id,
            usado,
            usado = FALSE AS no_usado,
            expira_en > NOW() AS vigente
     FROM codigos_invitacion_docente
     WHERE codigo = ?
     LIMIT 1`,
    [codigoLimpio]
  );

  if (!rows.length) {
    return { valido: false, error: 'Código de invitación inválido' };
  }

  const row = rows[0];
  if (!row.no_usado) {
    return { valido: false, error: 'Ese código ya fue utilizado' };
  }

  if (!row.vigente) {
    return { valido: false, error: 'Código expirado' };
  }

  return { valido: true, id: row.id };
}

export async function marcarCodigoUsado(conn, codigoId, usuarioId) {
  const conexion = conn || pool;
  await conexion.query(
    `UPDATE codigos_invitacion_docente
     SET usado = TRUE, usado_por = ?, fecha_uso = NOW()
     WHERE id = ?`,
    [usuarioId, codigoId]
  );
}

export async function listarCodigos({ soloNoUsados = false } = {}) {
  let sql = `SELECT c.*, u.nombre AS creador_nombre, u.apellido AS creador_apellido
             FROM codigos_invitacion_docente c
             LEFT JOIN usuarios u ON u.id = c.creado_por`;

  if (soloNoUsados) sql += ' WHERE c.usado = FALSE';

  sql += ' ORDER BY c.fecha_creacion DESC';
  const [rows] = await pool.query(sql);
  return rows;
}

export async function revocarCodigo(codigoId) {
  await pool.query(
    `UPDATE codigos_invitacion_docente SET usado = TRUE WHERE id = ?`,
    [codigoId]
  );
}

