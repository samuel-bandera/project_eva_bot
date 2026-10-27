
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as entregaModel from '../../models/acad/entrega_codigo_model.js';
import * as archivoModel from '../../models/acad/archivo_model.js';
import * as tareaModel from '../../models/acad/tarea_model.js';
import { calcularHash, rutaRelativa, borrarArchivo } from '../../utils/archivos.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  tareaId:      z.coerce.number().int().positive().optional().nullable(),
  evaluacionId: z.coerce.number().int().positive().optional().nullable()
});

const esquemaEstado = z.object({
  estado: z.enum(['pendiente', 'revisado', 'aprobado', 'rechazado'])
});

export async function listarDeTarea(req, res) {
  const { tareaId } = req.params;
  const entregas = await entregaModel.listarEntregasDeTarea(Number(tareaId));
  return ok(res, entregas);
}

export async function listarMias(req, res) {
  const entregas = await entregaModel.listarEntregasDeAlumno(req.usuario.id);
  return ok(res, entregas);
}

export async function obtener(req, res) {
  const e = await entregaModel.obtenerEntrega(Number(req.params.id));
  if (!e) return noEncontrado(res, 'Entrega no encontrada');
  return ok(res, e);
}

export async function crear(req, res) {
  if (!req.file) return error(res, 422, 'No se recibió archivo');

  const datos = esquemaCrear.parse(req.body);
  if (!datos.tareaId && !datos.evaluacionId) {
    return error(res, 422, 'Se requiere tareaId o evaluacionId');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let profesorId = null;

    if (datos.tareaId) {
      const tarea = await tareaModel.obtenerTarea(datos.tareaId);
      if (!tarea) { await conn.rollback(); return noEncontrado(res, 'Tarea no encontrada'); }
      profesorId = tarea.asignada_por;

      const ahora = new Date();
      const fechaEntrega = new Date(tarea.fecha_entrega);
      const esTardia = ahora > fechaEntrega;

      if (esTardia && !tarea.acepta_tardias) {
        await conn.rollback();
        return error(res, 403, 'La tarea ya venció y no acepta entregas tardías');
      }
    }

    const hash = await calcularHash(req.file.path);
    const existente = await archivoModel.buscarPorHash(hash);

    let archivoId;
    if (existente) {
      borrarArchivo(req.file.path);
      archivoId = existente.id;
    } else {
      archivoId = await archivoModel.crearArchivo(conn, {
        nombreOriginal: req.file.originalname,
        nombreInterno: req.file.filename,
        ruta: rutaRelativa(req.file.path),
        mimeType: req.file.mimetype,
        tamanoBytes: req.file.size,
        hashSha256: hash,
        subidoPor: req.usuario.id,
        tipoEntidad: 'entrega_codigo',
        entidadId: null
      });
    }

    const id = await entregaModel.crearEntrega(conn, {
      alumnoId: req.usuario.id,
      profesorId,
      tareaId: datos.tareaId || null,
      evaluacionId: datos.evaluacionId || null,
      archivoId,
      nombreArchivo: req.file.originalname,
      rutaArchivo: rutaRelativa(req.file.path)
    });

    await archivoModel.actualizarEntidad(conn, archivoId, 'entrega_codigo', id);

    await conn.commit();
    return creado(res, { id, archivoId }, 'Entrega subida');
  } catch (err) {
    await conn.rollback();
    if (req.file?.path) borrarArchivo(req.file.path);
    throw err;
  } finally {
    conn.release();
  }
}

export async function cambiarEstado(req, res) {
  const { id } = req.params;
  const { estado } = esquemaEstado.parse(req.body);

  const entrega = await entregaModel.obtenerEntrega(Number(id));
  if (!entrega) return noEncontrado(res, 'Entrega no encontrada');

  if (entrega.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta entrega');
  }

  await entregaModel.cambiarEstadoEntrega(null, entrega.id, estado);
  return ok(res, null, `Estado cambiado a ${estado}`);
}

import path from 'path';
import fs from 'fs';



export async function descargar(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM entregas_codigo WHERE id = ?', [req.params.id]);
    const entrega = rows[0];

    if (!entrega) return res.status(404).json({ ok: false, error: 'Entrega no encontrada' });
    if (!entrega.ruta_archivo) return res.status(404).json({ ok: false, error: 'Sin archivo' });

    if (req.usuario.tipo === 'alumno' && entrega.alumno_id !== req.usuario.id) {
      return res.status(403).json({ ok: false, error: 'Sin permiso' });
    }

    const path = await import('path');
    const fs = await import('fs');

    let rutaDB = entrega.ruta_archivo.replace(/\\/g, '/');


    let rutaFinal;
    if (rutaDB.includes('uploads/')) {
      rutaFinal = path.resolve(process.cwd(), rutaDB);
    } else {
      rutaFinal = path.resolve(process.cwd(), 'uploads', rutaDB);
    }

    if (!fs.existsSync(rutaFinal)) {
      console.error('[Entrega] Archivo no encontrado:', rutaFinal);
      return res.status(404).json({ ok: false, error: 'Archivo no encontrado en: ' + rutaFinal });
    }

    res.download(rutaFinal, entrega.nombre_archivo);
  } catch (e) {
    console.error('❌ ERROR EN DESCARGA:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
