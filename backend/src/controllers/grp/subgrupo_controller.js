
import { z } from 'zod';
import {} from '../../config/db.js';
import * as sgModel from '../../models/grp/subgrupo_model.js';
import { ok, creado, noEncontrado, error} from '../../utils/respuestas.js';

const esquemaCrear = z.object({
  grupoId:         z.coerce.number().int().positive(),
  materiaId:       z.coerce.number().int().positive().optional().nullable(),
  tareaId:         z.coerce.number().int().positive().optional().nullable(),
  nombre:          z.string().min(2).max(100),
  descripcion:     z.string().optional().nullable(),
  tipoCreacion:    z.enum(['autogestion', 'aleatorio', 'docente']).default('docente'),
  maxIntegrantes:  z.coerce.number().int().min(2).max(20).default(5),
  minIntegrantes:  z.coerce.number().int().min(2).max(20).default(2)
});

const esquemaIntegrante = z.object({
  alumnoId: z.coerce.number().int().positive(),
  rol:      z.enum(['integrante', 'lider']).default('integrante')
});

const esquemaEntregaGrupal = z.object({
  tareaId:      z.coerce.number().int().positive().optional().nullable(),
  evaluacionId: z.coerce.number().int().positive().optional().nullable(),
  titulo:       z.string().min(3).max(200),
  descripcion:  z.string().optional().nullable()
});

const esquemaCalificar = z.object({
  nota:               z.coerce.number().nonnegative(),
  comentarioProfesor: z.string().max(2000).optional().nullable(),
  estado:             z.enum(['aprobada', 'rechazada', 'revisada']).default('aprobada')
});

export async function listar(req, res) {
  const { grupoId, materiaId, tareaId } = req.query;
  const subgrupos = await sgModel.listarSubgrupos({
    grupoId: grupoId ? Number(grupoId) : null,
    materiaId: materiaId ? Number(materiaId) : null,
    tareaId: tareaId ? Number(tareaId) : null
  });
  return ok(res, subgrupos);
}

export async function obtener(req, res) {
  const sg = await sgModel.obtenerSubgrupo(Number(req.params.id));
  if (!sg) return noEncontrado(res, 'Subgrupo no encontrado');
  const integrantes = await sgModel.listarIntegrantes(sg.id);
  const entregas = await sgModel.listarEntregasDeSubgrupo(sg.id);
  return ok(res, { ...sg, integrantes, entregas });
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);
  const id = await sgModel.crearSubgrupo(null, {
    ...datos,
    creadoPor: req.usuario.id
  });
  return creado(res, { id }, 'Subgrupo creado');
}

export async function actualizar(req, res) {
  const datos = esquemaCrear.partial().extend({ activo: z.boolean().optional() }).parse(req.body);
  await sgModel.actualizarSubgrupo(null, Number(req.params.id), datos);
  return ok(res, null, 'Subgrupo actualizado');
}

export async function agregarIntegrante(req, res) {
  const { id } = req.params;
  const datos = esquemaIntegrante.parse(req.body);

  const sg = await sgModel.obtenerSubgrupo(Number(id));
  if (!sg) return noEncontrado(res, 'Subgrupo no encontrado');

  const total = await sgModel.contarIntegrantes(sg.id);
  if (total >= sg.max_integrantes) {
    return error(res, 409, `El subgrupo ya tiene ${total} integrantes (máx: ${sg.max_integrantes})`);
  }

  await sgModel.agregarIntegrante(null, {
    subgrupoId: sg.id,
    alumnoId: datos.alumnoId,
    rol: datos.rol
  });
  return ok(res, null, 'Integrante agregado');
}

export async function quitarIntegrante(req, res) {
  const { id, alumnoId } = req.params;
  await sgModel.quitarIntegrante(null, {
    subgrupoId: Number(id),
    alumnoId: Number(alumnoId)
  });
  return ok(res, null, 'Integrante removido');
}

export async function crearEntregaGrupal(req, res) {
  const { id } = req.params;
  const datos = esquemaEntregaGrupal.parse(req.body);

  const sg = await sgModel.obtenerSubgrupo(Number(id));
  if (!sg) return noEncontrado(res, 'Subgrupo no encontrado');

  const idEntrega = await sgModel.crearEntregaGrupal(null, {
    subgrupoId: sg.id,
    ...datos
  });
  return creado(res, { id: idEntrega }, 'Entrega grupal creada');
}

export async function calificarEntregaGrupal(req, res) {
  const { entregaId } = req.params;
  const datos = esquemaCalificar.parse(req.body);

  const e = await sgModel.obtenerEntregaGrupal(Number(entregaId));
  if (!e) return noEncontrado(res, 'Entrega no encontrada');

  await sgModel.calificarEntregaGrupal(null, e.id, datos);
  return ok(res, null, 'Entrega calificada');
}

