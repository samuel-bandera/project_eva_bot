
import { z } from 'zod';
import * as grupoModel from '../../models/grp/grupo_model.js';
import { ok, creado, noEncontrado, error } from '../../utils/respuestas.js';
import * as docentesGrupoModel from '../../models/grp/docentes_grupos_model.js';
import { pool } from '../../config/db.js';

const esquemaCrear = z.object({
  nombre:       z.string().min(3).max(100),
  codigo:       z.string().min(2).max(20),
  carrera:      z.string().max(100).optional().nullable(),
  cicloId:      z.coerce.number().int().positive().optional().nullable(),
  descripcion:  z.string().optional().nullable(),
  capacidadMax: z.coerce.number().int().min(1).max(200).default(50),
  color:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

const esquemaAgregarAlumno = z.object({
  alumnoId:      z.coerce.number().int().positive(),
  cargaHoraria:  z.enum(['completa', 'parcial']).default('completa')
});

export async function listar(req, res) {
  const { cicloId, activo } = req.query;
  const grupos = await grupoModel.listarGrupos({
    cicloId: cicloId ? Number(cicloId) : null,
    activo: activo === undefined ? null : activo === 'true'
  });
  return ok(res, grupos);
}

export async function misGrupos(req, res) {
  if (req.usuario.tipo === 'alumno') {
    const grupos = await grupoModel.listarGruposDeAlumno(req.usuario.id);
    return ok(res, grupos);
  }
  return ok(res, []);
}

export async function obtener(req, res) {
  const grupo = await grupoModel.obtenerGrupo(Number(req.params.id));
  if (!grupo) return noEncontrado(res, 'Grupo no encontrado');

  const alumnos = await grupoModel.listarAlumnosDeGrupo(grupo.id);
  return ok(res, { ...grupo, alumnos });
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const existente = await grupoModel.obtenerGrupoPorCodigo(datos.codigo);
  if (existente) return error(res, 409, 'Ya existe un grupo con ese código');

  const id = await grupoModel.crearGrupo(null, datos);
  return creado(res, { id }, 'Grupo creado');
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().extend({ activo: z.boolean().optional() }).parse(req.body);
  await grupoModel.actualizarGrupo(null, Number(req.params.id), datos);
  return ok(res, null, 'Grupo actualizado');
}

export async function agregarAlumno(req, res) {
  const { id } = req.params;
  const datos = esquemaAgregarAlumno.parse(req.body);

  const grupo = await grupoModel.obtenerGrupo(Number(id));
  if (!grupo) return noEncontrado(res, 'Grupo no encontrado');

  const total = await grupoModel.contarAlumnos(grupo.id);
  if (total >= grupo.capacidad_max) {
    return error(res, 409, 'El grupo alcanzó su capacidad máxima');
  }

  await grupoModel.agregarAlumno(null, {
    grupoId: grupo.id,
    alumnoId: datos.alumnoId,
    cargaHoraria: datos.cargaHoraria
  });
  return ok(res, null, 'Alumno agregado al grupo');
}

export async function quitarAlumno(req, res) {
  const { id, alumnoId } = req.params;
  await grupoModel.quitarAlumno(null, {
    grupoId: Number(id),
    alumnoId: Number(alumnoId)
  });
  return ok(res, null, 'Alumno removido del grupo');
}

export async function listarPorMateria(req, res) {
  const materiaId = Number(req.params.materiaId);
  if (!materiaId || Number.isNaN(materiaId)) {
    return error(res, 400, 'ID de materia inválido');
  }

  const docenteId = req.usuario.tipo === 'admin' ? null : req.usuario.id;
  const grupos = await grupoModel.listarGruposPorMateria(materiaId, docenteId);
  return ok(res, grupos);
}

export async function sugerirCodigo(req, res) {
  const carreraId = Number(req.params.carreraId);
  const { turno, paralelo } = req.query;
  if (!carreraId || Number.isNaN(carreraId)) {
    return error(res, 400, 'ID de carrera inválido');
  }
  const sugerencia = await grupoModel.sugerirCodigoGrupo(carreraId, turno, paralelo);
  if (!sugerencia) {
    return error(res, 404, 'Carrera no encontrada o inactiva');
  }
  return ok(res, sugerencia);
}

export async function listarDocentesDeGrupo(req, res) {
  const grupoId = Number(req.params.id);
  if (!grupoId || Number.isNaN(grupoId)) {
    return error(res, 400, 'ID de grupo inválido');
  }
  const asignaciones = await docentesGrupoModel.listarPorGrupo(grupoId);
  return ok(res, asignaciones);
}

export async function asignarDocenteAGrupo(req, res) {
  const grupoId = Number(req.params.id);
  const { docenteId, materiaId, tipoDocente = 'titular' } = req.body;
  if (!grupoId || !docenteId || !materiaId) {
    return error(res, 400, 'Faltan datos: grupoId, docenteId y materiaId son obligatorios');
  }
  if (!['titular', 'suplente'].includes(tipoDocente)) {
    return error(res, 400, 'tipoDocente debe ser "titular" o "suplente"');
  }

  const [docentes] = await pool.query(
    'SELECT id FROM usuarios WHERE id = ? AND tipo = ? AND activo = 1',
    [docenteId, 'docente']
  );
  if (!docentes.length) {
    return error(res, 404, 'Docente no encontrado o inactivo');
  }

  const [materiasDocente] = await pool.query(
    'SELECT 1 FROM materias_docente WHERE docente_id = ? AND materia_id = ?',
    [docenteId, materiaId]
  );
  if (!materiasDocente.length) {
    return error(res, 403, 'El docente no está asignado a esta materia');
  }

  const id = await docentesGrupoModel.crear({
    docenteId,
    grupoId,
    materiaId,
    asignadoPor: req.usuario.id,
    tipoAsignador: req.usuario.tipo === 'admin' ? 'admin' : 'coordinador',
    tipoDocente
  });
  return ok(res, { id, mensaje: 'Docente asignado correctamente' });
}

export async function desasignarDocenteDeGrupo(req, res) {
  const asignacionId = Number(req.params.asignacionId);
  if (!asignacionId || Number.isNaN(asignacionId)) {
    return error(res, 400, 'ID de asignación inválido');
  }
  await docentesGrupoModel.desactivar(asignacionId);
  return ok(res, { mensaje: 'Asignación eliminada' });
}
