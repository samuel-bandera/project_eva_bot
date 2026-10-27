import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import * as bancoModel from '../../models/acad/banco_pregunta_model.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';
import { aMySQLDatetime } from '../../utils/fechas.js';

const esquemaGenerar = z.object({
  materiaId:             z.coerce.number().int().positive(),
  cantidadMultiple:      z.coerce.number().int().min(0).max(50).default(0),
  cantidadVerdadero:     z.coerce.number().int().min(0).max(50).default(0),
  cantidadDesarrollo:    z.coerce.number().int().min(0).max(50).default(0),
  dificultad:            z.enum(['facil', 'media', 'dificil', 'mixto']).default('mixto'),

  titulo:                z.string().min(3).max(100).optional(),
  duracionMinutos:       z.coerce.number().int().positive().max(300).default(60),
  bloquearSalida:        z.boolean().default(false),
  monitoreoEnVivo:       z.boolean().default(true),
  notaMaxima:            z.coerce.number().positive().default(10),
  fechaApertura:         z.string().optional(),
  fechaCierre:           z.string().optional(),
});

const esquemaConfirmar = z.object({
  materiaId:             z.coerce.number().int().positive(),
  titulo:                z.string().min(3).max(100),
  descripcion:           z.string().optional().nullable(),
  tipo:                  z.enum(['parcial', 'tp', 'recuperatorio', 'final']).default('parcial'),
  fechaApertura:         z.string(),
  fechaCierre:           z.string(),
  duracionMinutos:       z.coerce.number().int().positive().default(60),
  bloquearSalida:        z.boolean().default(false),
  monitoreoEnVivo:       z.boolean().default(true),
  mostrarTiempo:         z.boolean().default(true),
  permitirExtension:     z.boolean().default(true),
  notaMaxima:            z.coerce.number().positive().default(10),
  preguntas:             z.array(z.object({
    bancoPreguntaId:     z.coerce.number().int().positive(),
    pregunta:            z.string(),
    respuesta_correcta:  z.string(),
    tipo:                z.enum(['multiple_choice', 'true_false', 'short_answer']),
    opciones:            z.array(z.string()).nullable().optional(),
    puntaje:             z.coerce.number().nonnegative().default(1),
    orden:               z.coerce.number().int().optional(),
  })).min(1),
});

export async function generarAutomatico(req, res) {
  const datos = esquemaGenerar.parse(req.body);

  const dificultad = datos.dificultad === 'mixto' ? null : datos.dificultad;

  const total = datos.cantidadMultiple + datos.cantidadVerdadero + datos.cantidadDesarrollo;
  if (total === 0) {
    return error(res, 422, 'Tenés que pedir al menos 1 pregunta');
  }


  const [multiple, verdadero, desarrollo] = await Promise.all([
    datos.cantidadMultiple > 0
      ? bancoModel.seleccionarAleatorias(null, {
          materiaId: datos.materiaId,
          tipo: 'multiple_choice',
          dificultad,
          cantidad: datos.cantidadMultiple,
        })
      : [],
    datos.cantidadVerdadero > 0
      ? bancoModel.seleccionarAleatorias(null, {
          materiaId: datos.materiaId,
          tipo: 'true_false',
          dificultad,
          cantidad: datos.cantidadVerdadero,
        })
      : [],
    datos.cantidadDesarrollo > 0
      ? bancoModel.seleccionarAleatorias(null, {
          materiaId: datos.materiaId,
          tipo: 'short_answer',
          dificultad,
          cantidad: datos.cantidadDesarrollo,
        })
      : [],
  ]);


  const todas = [...multiple, ...verdadero, ...desarrollo]
    .map((p, i) => ({
      bancoPreguntaId:    p.id,
      pregunta:           p.pregunta,
      respuesta_correcta: p.respuesta_correcta,
      tipo:               p.tipo,
      opciones:           p.opciones,
      dificultad:         p.dificultad,
      tema:               p.tema,
      puntaje:            1,
      orden:              i + 1,
    }));


  for (let i = todas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [todas[i], todas[j]] = [todas[j], todas[i]];
  }


  todas.forEach((p, i) => { p.orden = i + 1; });


  const advertencias = [];
  if (multiple.length < datos.cantidadMultiple) {
    advertencias.push(`Solo hay ${multiple.length} preguntas de opción múltiple (pediste ${datos.cantidadMultiple})`);
  }
  if (verdadero.length < datos.cantidadVerdadero) {
    advertencias.push(`Solo hay ${verdadero.length} de verdadero/falso (pediste ${datos.cantidadVerdadero})`);
  }
  if (desarrollo.length < datos.cantidadDesarrollo) {
    advertencias.push(`Solo hay ${desarrollo.length} de desarrollo (pediste ${datos.cantidadDesarrollo})`);
  }

  return ok(res, {
    preguntas: todas,
    total: todas.length,
    advertencias,
    configuracion: {
      materiaId:      datos.materiaId,
      duracionMinutos: datos.duracionMinutos,
      bloquearSalida:  datos.bloquearSalida,
      monitoreoEnVivo: datos.monitoreoEnVivo,
      notaMaxima:      datos.notaMaxima,
    },
  });
}

export async function confirmarGenerado(req, res) {
  const datos = esquemaConfirmar.parse(req.body);

  if (new Date(datos.fechaCierre) <= new Date(datos.fechaApertura)) {
    return error(res, 422, 'La fecha de cierre debe ser posterior a la de apertura');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id = await evalModel.crearEvaluacion(conn, {
      titulo:             datos.titulo,
      descripcion:        datos.descripcion || `Generado automáticamente — ${datos.preguntas.length} preguntas`,
      profesorId:         req.usuario.id,
      materiaId:          datos.materiaId,
      cicloId:            null,
      tipo:               datos.tipo,
      fechaPublicacion:   aMySQLDatetime(datos.fechaApertura),
      fechaApertura:      aMySQLDatetime(datos.fechaApertura),
      fechaCierre:        aMySQLDatetime(datos.fechaCierre),
      duracionMinutos:    datos.duracionMinutos,
      intentosPermitidos: 1,
      notaMaxima:         datos.notaMaxima,
      bloquearSalida:     datos.bloquearSalida,
      monitoreoEnVivo:    datos.monitoreoEnVivo,
      mostrarTiempo:      datos.mostrarTiempo,
      permitirExtension:  datos.permitirExtension,
      preguntas:          datos.preguntas.map(p => ({
        bancoPreguntaId:    p.bancoPreguntaId,
        pregunta:           p.pregunta,
        respuesta_correcta: p.respuesta_correcta,
        tipo:               p.tipo,
        opciones:           p.opciones,
        puntaje:            p.puntaje,
        orden:              p.orden,
      })),
    });


    const idsBanco = datos.preguntas.map(p => p.bancoPreguntaId);
    await bancoModel.marcarComoUsadas(conn, idsBanco);

    await conn.commit();
    return creado(res, { id }, 'Evaluación generada y guardada');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function estadisticasBanco(req, res) {
  const { materiaId } = req.params;
  const stats = await bancoModel.estadisticasBanco(Number(materiaId));
  return ok(res, stats);
}

export async function estadisticas(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }

  const stats = await evalModel.estadisticasEvaluacion(Number(id));
  return ok(res, stats);
}

export async function resultados(req, res) {
  const { id } = req.params;
  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');
  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return prohibido(res, 'No sos el dueño de esta evaluación');
  }

  const [stats, filas, dificultad] = await Promise.all([
    evalModel.estadisticasEvaluacion(Number(id)),
    evalModel.resultadosEvaluacion(Number(id)),
    evalModel.dificultadPorPregunta(Number(id)),
  ]);

  return ok(res, { stats, filas, dificultad });
}

