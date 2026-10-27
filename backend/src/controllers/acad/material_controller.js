
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as materialModel from '../../models/acad/material_model.js';
import * as archivoModel from '../../models/acad/archivo_model.js';
import { calcularHash, rutaRelativa, borrarArchivo } from '../../utils/archivos.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  titulo:       z.string().min(3).max(150),
  descripcion:  z.string().optional().nullable(),
  tipo:         z.enum(['apunte', 'video', 'link', 'ejercicio', 'otro']).default('apunte'),
  materiaId:    z.coerce.number().int().positive().optional().nullable(),
  urlExterna:   z.string().url().optional().nullable(),
  destacado:    z.boolean().default(false)
});

export async function listar(req, res) {
  const { materiaId, tipo, destacado } = req.query;
  const materiales = await materialModel.listarMateriales({
    materiaId: materiaId ? Number(materiaId) : null,
    tipo: tipo || null,
    destacado: destacado === undefined ? null : destacado === 'true'
  });
  return ok(res, materiales);
}

export async function obtener(req, res) {
  const m = await materialModel.obtenerMaterial(Number(req.params.id));
  if (!m) return noEncontrado(res, 'Material no encontrado');
  return ok(res, m);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);

  if (!req.file && !datos.urlExterna) {
    return error(res, 422, 'Se requiere un archivo o una URL externa');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let archivoId = null;
    let nombreArchivo = null;
    let rutaArchivo = null;

    if (req.file) {
      const hash = await calcularHash(req.file.path);
      const existente = await archivoModel.buscarPorHash(hash);

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
          tipoEntidad: 'material',
          entidadId: null
        });
      }

      nombreArchivo = req.file.originalname;
      rutaArchivo = rutaRelativa(req.file.path);
    }

    const id = await materialModel.crearMaterial(conn, {
      ...datos,
      subidoPor: req.usuario.id,
      archivoId,
      nombreArchivo,
      rutaArchivo
    });

    if (archivoId) {
      await archivoModel.actualizarEntidad(conn, archivoId, 'material', id);
    }

    await conn.commit();
    return creado(res, { id, archivoId }, 'Material creado');
  } catch (err) {
    await conn.rollback();
    if (req.file?.path) borrarArchivo(req.file.path);
    throw err;
  } finally {
    conn.release();
  }
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().parse(req.body);
  await materialModel.actualizarMaterial(null, Number(req.params.id), datos);
  return ok(res, null, 'Material actualizado');
}

export async function eliminar(req, res) {
  const { id } = req.params;
  const m = await materialModel.obtenerMaterial(Number(id));
  if (!m) return noEncontrado(res, 'Material no encontrado');

  if (m.subido_por !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés eliminar este material');
  }

  await materialModel.eliminarMaterial(null, m.id);
  return ok(res, null, 'Material eliminado');
}



export async function misMateriales(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, mat.nombre AS materia_nombre
      FROM materiales m
      JOIN materias mat ON mat.id = m.materia_id
      JOIN matriculas mt ON mt.materia_id = m.materia_id AND mt.alumno_id = ?
      ORDER BY m.tema ASC, m.fecha DESC
    `, [req.usuario.id]);
    return res.json({ ok: true, data: rows });
  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}


export async function descargarMaterial(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM materiales WHERE id = ?', [req.params.id]);
    const material = rows[0];
    if (!material || !material.ruta_archivo) return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });

    const fs = await import('fs');
    const path = await import('path');


    const rutaAbsoluta = path.resolve(process.cwd(), 'uploads', material.ruta_archivo.replace(/^uploads[/\\\\]/, ''));

    if (!fs.existsSync(rutaAbsoluta)) {
      return res.status(404).json({ ok: false, error: 'El archivo físico no existe en el servidor' });
    }

    res.download(rutaAbsoluta, material.nombre_archivo || 'material.pdf');
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
