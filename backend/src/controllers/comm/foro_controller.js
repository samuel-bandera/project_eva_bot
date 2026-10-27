
import { z } from 'zod';
import * as foroModel from '../../models/comm/publicacion_model.js';
import { ok, creado, noEncontrado, prohibido, error } from '../../utils/respuestas.js';

const ETIQUETAS_VALIDAS = ['ejercicio', 'teoria', 'examen', 'general', 'urgente'];

const esquemaMensaje = z.object({
  materiaId:  z.coerce.number().int().positive(),
  titulo:     z.string().min(3).max(200),
  contenido:  z.string().min(3).max(10000),
  padreId:    z.coerce.number().int().positive().optional().nullable(),
  etiquetas:  z.array(z.enum(ETIQUETAS_VALIDAS)).max(5).optional().default([]),
});

const esquemaReporte = z.object({
  motivo:  z.enum(['spam', 'ofensivo', 'fuera_de_tema', 'otro']),
  detalle: z.string().max(1000).optional().nullable()
});

export async function listar(req, res) {
  const { materiaId, soloRaiz } = req.query;
  if (!materiaId) return error(res, 422, 'materiaId es requerido');

  const mensajes = await foroModel.listarMensajesDeMateria(Number(materiaId), {
    soloRaiz: soloRaiz === 'true'
  });
  return ok(res, mensajes);
}

export async function verRespuestas(req, res) {
  const respuestas = await foroModel.listarRespuestas(Number(req.params.id));
  return ok(res, respuestas);
}

export async function obtener(req, res) {
  const m = await foroModel.obtenerMensaje(Number(req.params.id));
  if (!m) return noEncontrado(res, 'Mensaje no encontrado');
  const respuestas = await foroModel.listarRespuestas(m.id);
  return ok(res, { ...m, respuestas });
}

export async function crear(req, res) {
  const datos = esquemaMensaje.parse(req.body);
  const id = await foroModel.crearMensaje(null, {
    ...datos,
    autorId: req.usuario.id
  });
  return creado(res, { id }, 'Mensaje publicado');
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const datos = z.object({
    titulo:    z.string().min(3).max(200).optional(),
    contenido: z.string().min(3).max(10000).optional(),
    etiquetas: z.array(z.enum(['ejercicio', 'teoria', 'examen', 'general', 'urgente'])).max(5).optional(),
  }).parse(req.body);

  const m = await foroModel.obtenerMensaje(Number(id));
  if (!m) return noEncontrado(res, 'Mensaje no encontrado');
  if (m.autor_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés editar este mensaje');
  }

  await foroModel.actualizarMensaje(null, m.id, datos);
  return ok(res, null, 'Mensaje actualizado');
}

export async function eliminar(req, res) {
  const { id } = req.params;
  const m = await foroModel.obtenerMensaje(Number(id));
  if (!m) return noEncontrado(res, 'Mensaje no encontrado');
  if (m.autor_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No podés eliminar este mensaje');
  }
  await foroModel.eliminarMensaje(null, m.id);
  return ok(res, null, 'Mensaje eliminado');
}

export async function fijar(req, res) {
  const { id } = req.params;
  const { fijado } = z.object({ fijado: z.boolean() }).parse(req.body);
  await foroModel.fijarMensaje(null, Number(id), fijado);
  return ok(res, null, fijado ? 'Mensaje fijado' : 'Mensaje desfijado');
}

export async function cerrar(req, res) {
  const { id } = req.params;
  const { cerrado } = z.object({ cerrado: z.boolean() }).parse(req.body);
  await foroModel.cerrarMensaje(null, Number(id), cerrado);
  return ok(res, null, cerrado ? 'Mensaje cerrado' : 'Mensaje abierto');
}

export async function reportar(req, res) {
  const { id } = req.params;
  const datos = esquemaReporte.parse(req.body);

  const idReporte = await foroModel.crearReporte(null, {
    mensajeId: Number(id),
    reportadoPor: req.usuario.id,
    ...datos
  });
  return creado(res, { id: idReporte }, 'Reporte enviado');
}

export async function listarReportes(req, res) {
  const { estado } = req.query;
  const reportes = await foroModel.listarReportes({ estado: estado || 'pendiente' });
  return ok(res, reportes);
}

export async function resolverReporte(req, res) {
  const { id } = req.params;
  const { estado } = z.object({
    estado: z.enum(['revisado', 'eliminado', 'ignorado'])
  }).parse(req.body);

  await foroModel.resolverReporte(null, {
    reporteId: Number(id),
    resueltoPor: req.usuario.id,
    estado
  });
  return ok(res, null, 'Reporte resuelto');
}

