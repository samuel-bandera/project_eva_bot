
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashearPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verificarPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function generarCodigoInscripcion(prefijo = 'MAT', longitud = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = prefijo + '-';
  for (let i = 0; i < longitud; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

