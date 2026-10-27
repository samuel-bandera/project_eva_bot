
import path from 'path';
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as archivoModel from '../../models/acad/archivo_model.js';
import { calcularHash, rutaRelativa, existeArchivo, borrarArchivo } from '../../utils/archivos.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';
import { UPLOAD_ROOT } from '../../middlewares/upload_middleware.js';

const esquemaSubir = z.object({
  tipoEntidad: z.enum(['material', 'entrega_codigo', 'avatar', 'entrega_grupal', 'otro']),
  entidadId:   z.coerce.number().int().positive().optional().nullable()
});

export async function subir(req, res) {
  if (!req.file) return error(res, 422, 'No se recibió archivo');

  const datos = esquemaSubir.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();


    const hash = await calcularHash(req.file.path);


    const existente = await archivoModel.buscarPorHash(hash);
    if (existente) {

      borrarArchivo(req.file.path);

      await conn.commit();
      return ok(res, { archivoId: existente.id, reutilizado: true }, 'Archivo ya existía, se reutilizó');
    }

    const id = await archivoModel.crearArchivo(conn, {
      nombreOriginal: req.file.originalname,
      nombreInterno: req.file.filename,
      ruta: rutaRelativa(req.file.path),
      mimeType: req.file.mimetype,
      tamanoBytes: req.file.size,
      hashSha256: hash,
      subidoPor: req.usuario.id,
      tipoEntidad: datos.tipoEntidad,
      entidadId: datos.entidadId || null
    });

    await conn.commit();
    return creado(res, {
      archivoId: id,
      nombreOriginal: req.file.originalname,
      mimeType: req.file.mimetype,
      tamanoBytes: req.file.size
    }, 'Archivo subido');
  } catch (err) {
    await conn.rollback();

    if (req.file?.path) borrarArchivo(req.file.path);
    throw err;
  } finally {
    conn.release();
  }
}

export async function obtener(req, res) {
  const a = await archivoModel.obtenerArchivo(Number(req.params.id));
  if (!a) return noEncontrado(res, 'Archivo no encontrado');
  if (!a.activo) return prohibido(res, 'Archivo eliminado');
  return ok(res, a);
}

export async function descargar(req, res) {
  const { id } = req.params;
  const a = await archivoModel.obtenerArchivo(Number(id));
  if (!a) return noEncontrado(res, 'Archivo no encontrado');
  if (!a.activo) return prohibido(res, 'Archivo eliminado');

  const rutaAbsoluta = path.join(UPLOAD_ROOT, a.ruta);
  if (!existeArchivo(rutaAbsoluta)) {
    return noEncontrado(res, 'Archivo físico no encontrado en disco');
  }

  await archivoModel.incrementarDescargas(null, a.id);

  res.setHeader('Content-Type', a.mime_type);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(a.nombre_original)}"`
  );
  res.sendFile(rutaAbsoluta);
}

export async function listarDeEntidad(req, res) {
  const { tipoEntidad, entidadId } = req.query;
  if (!tipoEntidad || !entidadId) {
    return error(res, 422, 'tipoEntidad y entidadId son requeridos');
  }
  const archivos = await archivoModel.listarPorEntidad(tipoEntidad, Number(entidadId));
  return ok(res, archivos);
}

export async function eliminar(req, res) {
  const { id } = req.params;
  const a = await archivoModel.obtenerArchivo(Number(id));
  if (!a) return noEncontrado(res, 'Archivo no encontrado');

  if (a.subido_por !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés eliminar este archivo');
  }

  await archivoModel.desactivarArchivo(null, a.id);
  return ok(res, null, 'Archivo eliminado');
}

