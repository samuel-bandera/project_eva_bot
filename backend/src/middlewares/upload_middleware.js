
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const UPLOAD_ROOT = path.resolve('uploads');

for (const sub of ['materiales', 'entregas', 'avatares', 'chunks', 'justificaciones']) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, sub), { recursive: true });
}

const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/rtf',
  'text/rtf',
  'application/zip',
  'application/x-zip-compressed',
  'application/json',
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/yaml',
  'application/yaml',
  'text/x-yaml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/x-typescript',
  'text/typescript',
  'text/x-python',
  'application/x-python',
  'text/x-python3',
  'text/x-sh',
  'application/x-sh',
  'application/x-shellscript',
  'text/x-shellscript',
  'text/x-sql',
  'application/sql',
  'text/x-php',
  'application/x-httpd-php',
  'text/x-java',
  'text/x-java-source',
  'text/x-c',
  'text/x-csrc',
  'text/x-c++',
  'text/x-c++src',
  'text/x-csharp',
  'text/x-ruby',
  'application/x-ruby',
  'text/x-go',
  'text/x-rust',
  'text/x-lua',
  'text/x-perl',
  'text/x-r',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm'
]);

function sanitizarNombre(nombre) {
  return nombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
}

function storageFactory(subcarpeta) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(UPLOAD_ROOT, subcarpeta));
    },
    filename: (req, file, cb) => {
      const random = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${Date.now()}-${random}-${sanitizarNombre(base)}${ext}`);
    }
  });
}

const EXT_PERMITIDAS = new Set([
  '.txt', '.pdf', '.py', '.js', '.ts', '.sql', '.sh', '.md', '.json',
  '.html', '.css', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.rtf',
  '.odt', '.xml', '.yaml', '.yml'
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = MIME_PERMITIDOS.has(file.mimetype);
  const extOk = EXT_PERMITIDAS.has(ext);
  if (!mimeOk && !extOk) {
    return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype} (${ext})`));
  }
  cb(null, true);
}

export function uploadMaterial() {
  return multer({
    storage: storageFactory('materiales'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
  }).single('archivo');
}

export function uploadEntrega() {
  return multer({
    storage: storageFactory('entregas'),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter
  }).single('archivo');
}

export function uploadAvatar() {
  return multer({
    storage: storageFactory('avatares'),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter
  }).single('avatar');
}

export { UPLOAD_ROOT };



export function uploadComunicado() {
  return multer({
    storage: storageFactory('comunicados'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const mimesImagen = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!mimesImagen.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten imágenes (PNG, JPG, WEBP, GIF)'));
      }
      cb(null, true);
    }
  }).single('imagen');
}


export function uploadCartelera() {
  return multer({
    storage: storageFactory('cartelera'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const mimesImagen = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!mimesImagen.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten imágenes (PNG, JPG, WEBP, GIF)'));
      }
      cb(null, true);
    }
  }).single('imagen');
}

export function uploadJustificacion() {
  return multer({
    storage: storageFactory('justificaciones'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const mimesJustificacion = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp'
      ];
      if (!mimesJustificacion.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten PDF e imágenes (PNG, JPG, WEBP)'));
      }
      cb(null, true);
    }
  }).single('documento');
}
