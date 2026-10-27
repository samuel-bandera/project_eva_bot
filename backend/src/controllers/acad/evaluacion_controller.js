
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import * as materiaModel from '../../models/acad/materia_model.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';
import { aMySQLDatetime } from '../../utils/fechas.js';

function toMysqlDateTime(v) {
  if (v == null) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) {
    return v;
  }
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) throw new Error('Fecha inválida: ' + v);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}


const esquemaCrear = z.object({
  titulo:              z.string().min(3).max(100),
  descripcion:         z.string().optional().nullable(),
  materiaId:           z.coerce.number().int().positive(),
  cicloId:             z.coerce.number().int().positive().optional().nullable(),
  tipo:                z.enum(['parcial', 'tp', 'recuperatorio', 'final']).default('parcial'),
  fechaPublicacion:    z.string(),
  fechaApertura:       z.string(),
  fechaCierre:         z.string(),
  duracionMinutos:     z.coerce.number().int().positive().optional().nullable(),
  intentosPermitidos:  z.coerce.number().int().positive().default(1),
  notaMaxima:          z.coerce.number().positive().default(10),
  bloquearSalida:      z.boolean().default(false),
  monitoreoEnVivo:     z.boolean().default(true),
  mostrarTiempo:       z.boolean().default(true),
  permitirExtension:   z.boolean().default(true),
    grupos:              z.array(z.coerce.number().int().positive()).optional().default([]),
  preguntas:           z.array(z.object({
    pregunta:            z.string().min(1),
    respuesta_correcta:  z.string().min(1),
    orden:               z.coerce.number().int().optional(),
    puntaje:             z.coerce.number().nonnegative().optional(),
    tipo:                z.enum(['multiple_choice','short_answer','true_false']).optional().default('short_answer'),
    opciones:            z.array(z.string()).optional().nullable()
  })).optional().default([])
});

export async function listarDeProfesor(req, res) {
  const evs = await evalModel.listarEvaluacionesDeProfesor(req.usuario.id);
  return ok(res, evs);
}

export async function listarDeAlumno(req, res) {
  const evs = await evalModel.listarEvaluacionesDeAlumno(req.usuario.id);
  return ok(res, evs);
}


export async function publicar(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el profesor de esta evaluación');
  }

  await evalModel.publicarEvaluacion(null, Number(id));
  return ok(res, null, 'Evaluación publicada');
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);

    const autorizado = await materiaModel.docenteDictaMateria(req.usuario.id, datos.materiaId);
    if (!autorizado) {
      return error(res, 403, 'No estás asignado a esta materia');
    }

  if (new Date(datos.fechaCierre) <= new Date(datos.fechaApertura)) {
    return error(res, 422, 'La fecha de cierre debe ser posterior a la de apertura');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id = await evalModel.crearEvaluacion(conn, {
      titulo:              datos.titulo,
      descripcion:         datos.descripcion,
      profesorId:          req.usuario.id,
      materiaId:           datos.materiaId,
      cicloId:             datos.cicloId,
      tipo:                datos.tipo,
      fechaPublicacion:    aMySQLDatetime(datos.fechaPublicacion),
      fechaApertura:       aMySQLDatetime(datos.fechaApertura),
      fechaCierre:         aMySQLDatetime(datos.fechaCierre),
      duracionMinutos:     datos.duracionMinutos,
      intentosPermitidos:  datos.intentosPermitidos,
      notaMaxima:          datos.notaMaxima,
      tipoCorreccion:      datos.tipoCorreccion,
      bloquearSalida:      datos.bloquearSalida,
      monitoreoEnVivo:     datos.monitoreoEnVivo,
      mostrarTiempo:       datos.mostrarTiempo,
      permitirExtension:   datos.permitirExtension,
      preguntas:           datos.preguntas,
      grupos:              datos.grupos
    });

    await conn.commit();
    await evalModel.generarCodigoDespuesDeInsert(id);
    return creado(res, { id }, 'Evaluación creada en borrador');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function calcularMaxModelos(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT e.cantidad_modelos, e.cantidad_modelos AS actual,
            (SELECT COUNT(*) FROM preguntas_evaluacion WHERE evaluacion_id = e.id) AS cantidad_preguntas
     FROM evaluaciones e WHERE e.id = ?`,
    [id]
  );
  if (!rows.length) return noEncontrado(res, 'Evaluación no encontrada');

  const { factorial, maxModelosPosibles } = await import('../../utils/embarajar.js');
  const cantidadPreguntas = Number(rows[0].cantidad_preguntas) || 0;
  const maximo = maxModelosPosibles(cantidadPreguntas);
  const combinatorioTotal = factorial(cantidadPreguntas);

  return ok(res, {
    cantidad_preguntas: cantidadPreguntas,
    max_modelos: maximo,
    combinatorio_total: combinatorioTotal,
    actual: Number(rows[0].cantidad_modelos) || 1,
    limitado: combinatorioTotal > maximo,
  });
}


export async function actualizarCantidadModelos(req, res) {
  const { id } = req.params;
  const { cantidad } = req.body;

  const num = Number(cantidad);
  if (!Number.isInteger(num) || num < 1) {
    return error(res, 400, 'cantidad debe ser un entero >= 1');
  }

  const { maxModelosPosibles } = await import('../../utils/embarajar.js');
  const [pregRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM preguntas_evaluacion WHERE evaluacion_id = ?',
    [id]
  );
  const cantidadPreguntas = Number(pregRows[0].total) || 0;
  const maximo = maxModelosPosibles(cantidadPreguntas);

  if (num > maximo) {
    return error(res, 422,
      `No se pueden crear ${num} modelos. Máximo: ${maximo} (con ${cantidadPreguntas} preguntas)`);
  }

  await pool.query(
    'UPDATE evaluaciones SET cantidad_modelos = ? WHERE id = ?',
    [num, id]
  );

  return ok(res, {
    cantidad_modelos: num,
    cantidad_preguntas: cantidadPreguntas,
    max_modelos: maximo,
  }, `Configurado: ${num} modelo${num > 1 ? 's' : ''}`);
}

export async function obtener(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');


  if (req.usuario.tipo === 'alumno') {
    ev.preguntas = ev.preguntas.map(p => ({
      id: p.id,
      pregunta: p.pregunta,
      orden: p.orden,
      puntaje: p.puntaje,
      tipo: p.tipo,
      opciones: p.opciones
    }));
  }

  return ok(res, ev);
}

export async function abrir(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }
  if (ev.estado !== 'publicada' && ev.estado !== 'cerrada') {
    return error(res, 409, `No se puede abrir desde estado "${ev.estado}"`);
  }

  await evalModel.abrirEvaluacion(null, Number(id));
  return ok(res, null, 'Evaluación abierta');
}

export async function cerrar(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }
  if (ev.estado !== 'abierta') {
    return error(res, 409, `Solo se pueden cerrar evaluaciones abiertas (actual: ${ev.estado})`);
  }

  await evalModel.cerrarEvaluacion(null, Number(id));
  return ok(res, null, 'Evaluación cerrada');
}

export async function despublicar(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }
  if (ev.estado !== 'publicada') {
    return error(res, 409, `Solo se pueden despublicar desde "publicada" (actual: ${ev.estado})`);
  }

  await evalModel.despublicarEvaluacion(null, Number(id));
  return ok(res, null, 'Evaluación despublicada');
}

const esquemaAgregarPregunta = z.object({
  pregunta:            z.string().min(1),
  respuesta_correcta:  z.string().min(1),
  tipo:                z.enum(['multiple_choice','short_answer','true_false']).default('short_answer'),
  puntaje:             z.coerce.number().nonnegative().default(1),
  opciones:            z.array(z.string()).optional().nullable(),
  orden:               z.coerce.number().int().optional(),
  banco_pregunta_id:   z.coerce.number().int().positive().optional().nullable(),
});

export async function agregarPregunta(req, res) {
  const { id } = req.params;
  const datos = esquemaAgregarPregunta.parse(req.body);

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }
  if (ev.estado !== 'borrador' && ev.estado !== 'publicada') {
    return error(res, 409, `No se pueden agregar preguntas en estado "${ev.estado}"`);
  }

  const pregunta = await evalModel.agregarPreguntaEvaluacion(null, Number(id), datos);
  return creado(res, pregunta, 'Pregunta agregada');
}

export async function actualizar(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }


  if (!['borrador', 'publicada'].includes(ev.estado)) {
    return error(res, 409, `No se puede editar en estado "${ev.estado}"`);
  }

  const esquema = z.object({
    titulo: z.string().min(3).max(100).optional(),
    descripcion: z.string().max(500).nullable().optional(),
    fechaApertura: z.string().optional(),
    fechaCierre: z.string().optional(),
    duracionMinutos: z.coerce.number().int().positive().optional(),
    notaMaxima: z.coerce.number().positive().optional(),
  }).strict();

  const datos = esquema.parse(req.body);

  const campos = [];
  const valores = [];

  if (datos.titulo !== undefined)        { campos.push('titulo = ?');           valores.push(datos.titulo); }
  if (datos.descripcion !== undefined)   { campos.push('descripcion = ?');      valores.push(datos.descripcion); }
  if (datos.fechaApertura !== undefined) { campos.push('fecha_apertura = ?');   valores.push(toMysqlDateTime(datos.fechaApertura)); }
  if (datos.fechaCierre !== undefined)   { campos.push('fecha_cierre = ?');     valores.push(toMysqlDateTime(datos.fechaCierre)); }
  if (datos.duracionMinutos !== undefined) { campos.push('duracion_minutos = ?'); valores.push(datos.duracionMinutos); }
  if (datos.notaMaxima !== undefined)    { campos.push('nota_maxima = ?');      valores.push(datos.notaMaxima); }

  if (!campos.length) return error(res, 400, 'No hay campos para actualizar');

  valores.push(Number(id));
  await pool.query(
    `UPDATE evaluaciones SET ${campos.join(', ')} WHERE id = ?`,
    valores
  );

  return ok(res, null, 'Evaluación actualizada');
}

