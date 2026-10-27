import * as modelo from '../../models/acad/carrera_model.js';
import { ok, error } from '../../utils/respuestas.js';

export async function listar(req, res) {
  if (req.usuario.tipo === 'admin') return ok(res, await modelo.listarTodas());
  if (req.usuario.tipo === 'coordinador') {
    if (req.usuario.tipo_coordinacion === 'general') return ok(res, await modelo.listarTodas());
    return ok(res, await modelo.listarDeCoordinador(req.usuario.id));
  }
  return error(res, 403, 'Acceso restringido');
}

export async function obtener(req, res) {
  const carrera = await modelo.obtenerPorId(req.params.id);
  if (!carrera) return error(res, 404, 'Carrera no encontrada');
  const [materias, docentes, alumnos] = await Promise.all([
    modelo.materiasDeCarrera(req.params.id),
    modelo.docentesDeCarrera(req.params.id),
    modelo.alumnosDeCarrera(req.params.id),
  ]);
  return ok(res, { ...carrera, materias, docentes, alumnos });
}

export async function materias(req, res) {
  return ok(res, await modelo.materiasDeCarrera(req.params.id));
}

export async function docentes(req, res) {
  return ok(res, await modelo.docentesDeCarrera(req.params.id));
}

export async function alumnos(req, res) {
  return ok(res, await modelo.alumnosDeCarrera(req.params.id));
}
