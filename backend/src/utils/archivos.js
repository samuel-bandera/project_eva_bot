
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

export async function calcularHash(ruta) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(ruta);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function rutaRelativa(rutaAbsoluta) {
  return path.relative(path.resolve('uploads'), rutaAbsoluta).replace(/\\/g, '/');
}

export function existeArchivo(ruta) {
  try { return fs.existsSync(ruta); } catch { return false; }
}

export function borrarArchivo(ruta) {
  try { if (fs.existsSync(ruta)) fs.unlinkSync(ruta); } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[archivos] error:', e.message);
  }
}

