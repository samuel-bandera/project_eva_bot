
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no está configurado en .env');
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET debe tener al menos 32 caracteres');
}
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function firmarToken(payload) {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function verificarToken(token) {
  return jwt.verify(token, SECRET);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calcularExpiracion(dias = 7) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

export function extraerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

