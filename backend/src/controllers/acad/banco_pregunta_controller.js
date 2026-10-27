
import { z } from 'zod';
import * as bpModel from '../../models/acad/banco_pregunta_model.js';
import { ok, creado, noEncontrado } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  materiaId:          z.coerce.number().int().positive(),
  pregunta:           z.string().min(5),
  respuestaCorrecta:  z.string().min(1),
  dificultad:         z.enum(['facil', 'media', 'dificil']).default('media'),
  tema:               z.string().max(100).optional().nullable()
});

export async function listar(req, res) {
  const { materiaId, dificultad, tema } = req.query;
  const preguntas = await bpModel.listarPorMateria(Number(materiaId), {
    dificultad: dificultad || null,
    tema: tema || null
  });
  return ok(res, preguntas);
}

export async function obtener(req, res) {
  const p = await bpModel.obtenerPregunta(Number(req.params.id));
  if (!p) return noEncontrado(res, 'Pregunta no encontrada');
  return ok(res, p);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const id = await bpModel.crearPregunta(null, {
    ...datos,
    agregadaPor: req.usuario.id
  });
  return creado(res, { id }, 'Pregunta agregada al banco');
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().extend({ activa: z.boolean().optional() }).parse(req.body);
  await bpModel.actualizarPregunta(null, Number(req.params.id), datos);
  return ok(res, null, 'Pregunta actualizada');
}

export async function desactivar(req, res) {
  await bpModel.desactivarPregunta(null, Number(req.params.id));
  return ok(res, null, 'Pregunta desactivada');
}

export async function estadisticas(req, res) {
  const stats = await bpModel.estadisticasPorMateria(Number(req.params.materiaId));
  return ok(res, stats);
}

