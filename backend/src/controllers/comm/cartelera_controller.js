
import { z } from 'zod';
import * as cartModel from '../../models/comm/cartelera_model.js';
import { ok, noEncontrado, prohibido } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  titulo:     z.string().min(3).max(150),
  contenido:  z.string().min(3),
  tipo:       z.enum(['general', 'materia', 'grupo']).default('general'),
  materiaId:  z.coerce.number().int().positive().optional().nullable(),
  grupoId:    z.coerce.number().int().positive().optional().nullable(),
  fijado:     z.boolean().default(false)
});

export async function listar(req, res) {
  const { tipo, materiaId, grupoId } = req.query;
  const anuncios = await cartModel.listarAnuncios({
    tipo: tipo || null,
    materiaId: materiaId ? Number(materiaId) : null,
    grupoId: grupoId ? Number(grupoId) : null,
    usuarioId: req.usuario.id
  });
  return ok(res, anuncios);
}

export async function obtener(req, res) {
  const a = await cartModel.obtenerAnuncio(Number(req.params.id));
  if (!a) return noEncontrado(res, 'Anuncio no encontrado');
  return ok(res, a);
}

export async function crear(req, res) {
  try {
    const { titulo, contenido, fijado } = req.body;
    const autorId = req.usuario.id;
    const imagenUrl = req.file ? `cartelera/${req.file.filename}` : null;

    if (!titulo || !contenido) return res.status(422).json({ ok: false, error: 'Título y contenido requeridos' });
    if (contenido.length > 250) return res.status(422).json({ ok: false, error: 'El texto no puede superar los 250 caracteres' });

    const id = await cartModel.crearAnuncio(null, {
      titulo,
      contenido,
      fijado: fijado === '1' || fijado === true,
      autorId,
      imagenUrl
    });
    return res.status(201).json({ ok: true, data: { id }, message: 'Anuncio publicado' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().parse(req.body);
  const a = await cartModel.obtenerAnuncio(Number(req.params.id));
  if (!a) return noEncontrado(res, 'Anuncio no encontrado');
  if (a.autor_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el autor de este anuncio');
  }
  await cartModel.actualizarAnuncio(null, a.id, datos);
  return ok(res, null, 'Anuncio actualizado');
}

export async function eliminar(req, res) {
  const a = await cartModel.obtenerAnuncio(Number(req.params.id));
  if (!a) return noEncontrado(res, 'Anuncio no encontrado');
  if (a.autor_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el autor de este anuncio');
  }
  await cartModel.eliminarAnuncio(null, a.id);
  return ok(res, null, 'Anuncio eliminado');
}



export async function like(req, res) {
  try {
    const liked = await cartModel.toggleLike(Number(req.params.id), req.usuario.id);
    return res.json({ ok: true, data: { liked } });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}

export async function comentar(req, res) {
  try {
    const { contenido } = req.body;
    if (!contenido || contenido.trim().length === 0) return res.status(422).json({ ok: false, error: 'Comentario vacío' });
    await cartModel.addComentario(Number(req.params.id), req.usuario.id, contenido.trim());
    return res.status(201).json({ ok: true });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}

export async function listarComentarios(req, res) {
  try {
    const comentarios = await cartModel.getComentarios(Number(req.params.id));
    return res.json({ ok: true, data: comentarios });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}
