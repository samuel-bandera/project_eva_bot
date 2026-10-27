
import { z } from 'zod';
import * as asisModel from '../../models/acad/asistencia_model.js';
import * as grupoModel from '../../models/grp/grupo_model.js';
import { ok, creado, error, noEncontrado } from '../../utils/respuestas.js';

const esquemaRegistrar = z.object({
  alumnoId:      z.coerce.number().int().positive(),
  materiaId:     z.coerce.number().int().positive(),
  sesionId:      z.coerce.number().int().positive().optional().nullable(),
  fecha:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estado:        z.enum(['presente', 'ausente', 'tarde', 'justificado']).default('presente'),
  observacion:   z.string().max(500).optional().nullable()
});

const esquemaMasiva = z.object({
  grupoId: z.coerce.number().int().positive().optional().nullable(),
  materiaId:  z.coerce.number().int().positive(),
  fecha:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sesionId:   z.coerce.number().int().positive().optional().nullable(),
  registros:  z.array(z.object({
    alumnoId:    z.coerce.number().int().positive(),
    estado:      z.enum(['presente', 'ausente', 'tarde', 'justificado']),
    observacion: z.string().max(500).optional().nullable()
  })).min(1)
});

const esquemaFalta = z.object({
  alumnoId:    z.coerce.number().int().positive(),
  materiaId:   z.coerce.number().int().positive().optional().nullable(),
  fecha:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo:      z.string().max(255).optional().nullable(),
  justificada: z.boolean().default(false),
  observacion: z.string().max(1000).optional().nullable()
});

const esquemaSesion = z.object({
  grupoId: z.coerce.number().int().positive().optional().nullable(),
  docenteId: z.coerce.number().int().positive().optional().nullable(),
  materiaId:     z.coerce.number().int().positive(),
  titulo:        z.string().max(150).optional().nullable(),
  fecha:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio:    z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  horaFin:       z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  aula:          z.string().max(50).optional().nullable(),
  tipo:          z.enum(['teorica', 'practica', 'laboratorio', 'examen']).default('teorica'),
  observaciones: z.string().max(1000).optional().nullable()
});

export async function listarMiAsistencia(req, res) {
  const { materiaId, desde, hasta } = req.query;
  const filas = await asisModel.listarAsistenciaDeAlumno(req.usuario.id, {
    materiaId: materiaId ? Number(materiaId) : null,
    desde: desde || null,
    hasta: hasta || null
  });
  return ok(res, filas);
}

export async function resumenMiAsistencia(req, res) {
  const { materiaId } = req.query;
  const resumen = await asisModel.resumenAsistenciaAlumno(
    req.usuario.id,
    materiaId ? Number(materiaId) : null
  );
  return ok(res, resumen);
}

export async function registrar(req, res) {
  const datos = esquemaRegistrar.parse(req.body);

  const id = await asisModel.registrarAsistencia(null, {
    ...datos,
    profesorId: req.usuario.id
  });

  return creado(res, { id }, 'Asistencia registrada');
}

export async function registrarMasiva(req, res) {
  const datos = esquemaMasiva.parse(req.body);

  const filas = datos.registros.map(r => [
    r.alumnoId,
    datos.materiaId,
    req.usuario.id,
    datos.sesionId || null,
    datos.fecha,
    r.estado,
    r.observacion || null
  ]);

  const total = await asisModel.registrarAsistenciaMasiva(null, filas, datos.grupoId || null);
  return ok(res, { total }, `${total} registros procesados`);
}

export async function listarMisFaltas(req, res) {
  const faltas = await asisModel.listarFaltasDeAlumno(req.usuario.id);
  return ok(res, faltas);
}

export async function registrarFalta(req, res) {
  const datos = esquemaFalta.parse(req.body);

  const id = await asisModel.registrarFalta(null, {
    ...datos,
    profesorId: req.usuario.id
  });

  return creado(res, { id }, 'Falta registrada');
}

export async function justificarFalta(req, res) {
  const { id } = req.params;
  const { observacion } = z.object({
    observacion: z.string().min(3).max(1000)
  }).parse(req.body);

  await asisModel.justificarFalta(null, Number(id), observacion);
  return ok(res, null, 'Falta justificada');
}

export async function listarSesionesDeMateria(req, res) {
  const { materiaId } = req.params;
  const grupoId = req.query.grupoId ? Number(req.query.grupoId) : null;
  const sesiones = await asisModel.listarSesionesDeMateria(Number(materiaId), grupoId);
  return ok(res, sesiones);
}

export async function crearSesion(req, res) {
  const datos = esquemaSesion.parse(req.body);

  const id = await asisModel.crearSesionClase(null, {
    ...datos,
    profesorId: datos.docenteId || req.usuario.id
  });

  return creado(res, { id }, 'Sesión creada');
}

export async function listarGruposDeMateria(req, res) {
  const { materiaId } = req.params;
  const grupos = await grupoModel.listarGruposPorMateria(Number(materiaId), req.usuario.id);
  return ok(res, grupos);
}

export async function listarAlumnosDeGrupo(req, res) {
  const { grupoId } = req.params;
  const alumnos = await asisModel.listarAlumnosDeGrupo(Number(grupoId));
  return ok(res, alumnos);
}

export async function subirDocumentoJustificacion(req, res) {
  if (!req.file) {
    return error(res, 422, 'No se recibió ningún archivo');
  }
  const { id } = req.params;
  const falta = await asisModel.obtenerFaltaConDocumento(Number(id));
  if (!falta) {
    return noEncontrado(res, 'Falta no encontrada');
  }
  const rutaRelativa = '/uploads/justificaciones/' + req.file.filename;
  await asisModel.guardarDocumentoJustificacion(null, Number(id), {
    documentoUrl: rutaRelativa,
    documentoNombre: req.file.originalname,
    documentoMime: req.file.mimetype
  });
  return ok(res, {
    documentoUrl: rutaRelativa,
    documentoNombre: req.file.originalname
  }, 'Documento adjuntado y falta justificada');
}

export async function listarFaltasDeMateria(req, res) {
  const { materiaId } = req.params;
  const grupoId = req.query.grupoId ? Number(req.query.grupoId) : null;
  const faltas = await asisModel.listarFaltasDeMateria(Number(materiaId), grupoId);
  return ok(res, faltas);
}
