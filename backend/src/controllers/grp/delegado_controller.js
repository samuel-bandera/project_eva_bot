
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as delModel from '../../models/grp/delegado_model.js';
import { ok, creado, noEncontrado, error} from '../../utils/respuestas.js';

const esquemaCrearDelegado = z.object({
  grupoId:         z.coerce.number().int().positive(),
  alumnoId:        z.coerce.number().int().positive(),
  tipo:            z.enum(['principal', 'subdelegado']),
  periodoInicio:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodoFin:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  votosObtenidos:  z.coerce.number().int().nonnegative().default(0)
});

const esquemaCrearEleccion = z.object({
  grupoId:     z.coerce.number().int().positive(),
  titulo:      z.string().min(3).max(150),
  fechaInicio: z.string().datetime(),
  fechaFin:    z.string().datetime()
});

const esquemaCandidato = z.object({
  alumnoId:  z.coerce.number().int().positive(),
  tipo:      z.enum(['principal', 'subdelegado']),
  propuesta: z.string().max(2000).optional().nullable()
});

const esquemaVoto = z.object({
  candidatoId: z.coerce.number().int().positive(),
  tipo:        z.enum(['principal', 'subdelegado'])
});

export async function listarDelegadosDeGrupo(req, res) {
  const { grupoId } = req.params;
  const delegados = await delModel.listarDelegadosDeGrupo(Number(grupoId));
  return ok(res, delegados);
}

export async function misDelegados(req, res) {
  const delegados = await delModel.listarDelegadosDeAlumno(req.usuario.id);
  return ok(res, delegados);
}

export async function crearDelegado(req, res) {
  const datos = esquemaCrearDelegado.parse(req.body);
  const id = await delModel.crearDelegado(null, datos);
  return creado(res, { id }, 'Delegado registrado');
}

export async function listarElecciones(req, res) {
  const { grupoId, estado } = req.query;
  const elecciones = await delModel.listarElecciones({
    grupoId: grupoId ? Number(grupoId) : null,
    estado: estado || null
  });
  return ok(res, elecciones);
}

export async function obtenerEleccion(req, res) {
  const e = await delModel.obtenerEleccion(Number(req.params.id));
  if (!e) return noEncontrado(res, 'Elección no encontrada');

  const candidatos = await delModel.listarCandidatos(e.id);
  return ok(res, { ...e, candidatos });
}

export async function crearEleccion(req, res) {
  const datos = esquemaCrearEleccion.parse(req.body);

  if (new Date(datos.fechaFin) <= new Date(datos.fechaInicio)) {
    return error(res, 422, 'La fecha de fin debe ser posterior al inicio');
  }

  const id = await delModel.crearEleccion(null, {
    ...datos,
    creadoPor: req.usuario.id
  });
  return creado(res, { id }, 'Elección creada');
}

export async function cambiarEstadoEleccion(req, res) {
  const { id } = req.params;
  const { estado } = z.object({
    estado: z.enum(['borrador', 'postulacion', 'votacion', 'cerrada', 'finalizada'])
  }).parse(req.body);

  await delModel.actualizarEstadoEleccion(null, Number(id), estado);
  return ok(res, null, `Elección en estado ${estado}`);
}

export async function postular(req, res) {
  const { id } = req.params;
  const datos = esquemaCandidato.parse(req.body);

  const eleccion = await delModel.obtenerEleccion(Number(id));
  if (!eleccion) return noEncontrado(res, 'Elección no encontrada');
  if (eleccion.estado !== 'postulacion') {
    return error(res, 409, 'La elección no está en etapa de postulación');
  }

  const idCand = await delModel.crearCandidato(null, {
    eleccionId: eleccion.id,
    ...datos
  });
  return creado(res, { id: idCand }, 'Candidatura registrada');
}

export async function votar(req, res) {
  const { id } = req.params;
  const datos = esquemaVoto.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const eleccion = await delModel.obtenerEleccion(Number(id));
    if (!eleccion) { await conn.rollback(); return noEncontrado(res, 'Elección no encontrada'); }
    if (eleccion.estado !== 'votacion') {
      await conn.rollback();
      return error(res, 409, 'La elección no está en etapa de votación');
    }

    const yaVoto = await delModel.yaVoto(conn, {
      eleccionId: eleccion.id,
      votanteId: req.usuario.id,
      tipo: datos.tipo
    });
    if (yaVoto) {
      await conn.rollback();
      return error(res, 409, 'Ya votaste en esta categoría');
    }

    await delModel.registrarVoto(conn, {
      eleccionId: eleccion.id,
      votanteId: req.usuario.id,
      candidatoId: datos.candidatoId,
      tipo: datos.tipo
    });

    await conn.commit();
    return ok(res, null, 'Voto registrado');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function verResultados(req, res) {
  const { id } = req.params;
  const eleccion = await delModel.obtenerEleccion(Number(id));
  if (!eleccion) return noEncontrado(res, 'Elección no encontrada');

  const res_ = await delModel.resultados(eleccion.id);
  return ok(res, { eleccion, resultados: res_ });
}

