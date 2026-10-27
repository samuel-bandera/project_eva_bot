import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../config/db.js';
import { plantillaCodigoVerificacion } from './email_templates.js';

const MINUTOS_VALIDEZ_CODIGO = 10;

let transportador = null;

function crearTransportador() {
  if (transportador) return transportador;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const puerto = Number(process.env.SMTP_PORT) || 587;
  const usuario = process.env.SMTP_USER;
  const clave = process.env.SMTP_PASS;

  if (!usuario || !clave) {
    console.warn('SMTP_USER o SMTP_PASS no configurados. Los emails no se enviarán.');
    return null;
  }

  transportador = nodemailer.createTransport({
    host,
    port: puerto,
    secure: false,
    auth: { user: usuario, pass: clave },
  });

  return transportador;
}

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function solicitarCodigoVerificacion(email, ip = null) {
  const codigo = generarCodigo();
  const codigoHash = crypto.createHash('sha256').update(codigo).digest('hex');

  const [resultado] = await pool.query(
    `INSERT INTO verificaciones_codigo (email, codigo_hash, ip, expira_en, usado)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ${MINUTOS_VALIDEZ_CODIGO} MINUTE), FALSE)`,
    [email, codigoHash, ip]
  );

  const [filasExpiracion] = await pool.query(
    'SELECT expira_en FROM verificaciones_codigo WHERE id = ?',
    [resultado.insertId]
  );
  const expiracion = filasExpiracion[0]?.expira_en ?? null;

  const transporte = crearTransportador();
  let enviado = false;
  let errorEnvio = null;

  if (transporte) {
    try {
      const remitente = process.env.SMTP_FROM_EMAIL || 'evalbot@example.com';
      const nombreRemitente = process.env.SMTP_FROM_NAME || 'EvalBot';

      await transporte.sendMail({
        from: `"${nombreRemitente}" <${remitente}>`,
        to: email,
        subject: 'Código de verificación EvalBot',
        html: plantillaCodigoVerificacion(codigo, MINUTOS_VALIDEZ_CODIGO),
        text: `Tu código de verificación de EvalBot es: ${codigo}\nExpira en ${MINUTOS_VALIDEZ_CODIGO} minutos.`,
      });

      enviado = true;
      if (process.env.NODE_ENV !== 'production') {
        if (process.env.NODE_ENV !== 'production') console.log(`Código para ${email}: ${codigo}`);
      }
    } catch (error) {
      errorEnvio = error.message;
      console.error(`Error al enviar email a ${email}:`, error.message);
    }
  }

  if (!enviado && process.env.NODE_ENV !== 'production') {
    if (process.env.NODE_ENV !== 'production') console.log(`Código de verificación para ${email}: ${codigo} (expira en ${MINUTOS_VALIDEZ_CODIGO} min)`);
    if (errorEnvio) console.error(`[Email] Error de envío: ${errorEnvio}`);
  }

  return {
    id: resultado.insertId,
    expiraEn: expiracion,
    ttlMinutos: MINUTOS_VALIDEZ_CODIGO,
    enviado,
    errorEnvio,
  };
}

export async function verificarCodigo(email, codigo) {
  if (!email || !codigo) return false;

  const codigoHash = crypto.createHash('sha256').update(String(codigo)).digest('hex');

  const [filas] = await pool.query(
    `SELECT id FROM verificaciones_codigo
     WHERE email = ? AND codigo_hash = ? AND usado = FALSE AND expira_en > NOW()
     ORDER BY id DESC LIMIT 1`,
    [email, codigoHash]
  );

  if (!filas.length) return false;

  await pool.query(
    'UPDATE verificaciones_codigo SET usado = TRUE WHERE id = ?',
    [filas[0].id]
  );

  return true;
}

export async function emailEstaVerificado(email) {
  const [filas] = await pool.query(
    `SELECT id FROM verificaciones_codigo
     WHERE email = ? AND usado = TRUE AND creado_en > NOW() - INTERVAL 1 HOUR
     ORDER BY id DESC LIMIT 1`,
    [email]
  );
  return filas.length > 0;
}
