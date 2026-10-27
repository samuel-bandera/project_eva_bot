
import { z } from 'zod';
import * as cicloModel from '../../models/admin/ciclo_model.js';
import { ok, creado, noEncontrado } from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  nombre:      z.string().min(3).max(100),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activo:      z.boolean().optional()
});

export async function listar(req, res) {
  const { activo } = req.query;
  const ciclos = await cicloModel.listarCiclos({
    activo: activo === undefined ? null : activo === 'true'
  });
  return ok(res, ciclos);
}

export async function obtenerActivo(req, res) {
  const ciclo = await cicloModel.obtenerCicloActivo();
  return ok(res, ciclo);
}

export async function obtener(req, res) {
  const ciclo = await cicloModel.obtenerCiclo(Number(req.params.id));
  if (!ciclo) return noEncontrado(res, 'Ciclo no encontrado');
  return ok(res, ciclo);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const id = await cicloModel.crearCiclo(null, datos);
  return creado(res, { id }, 'Ciclo creado');
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().parse(req.body);
  await cicloModel.actualizarCiclo(null, Number(req.params.id), datos);
  return ok(res, null, 'Ciclo actualizado');
}

