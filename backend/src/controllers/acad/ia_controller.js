import * as iaService from '../../services/ia_service.js';
import { ok, error } from '../../utils/respuestas.js';

export async function estado(req, res) {
  return ok(res, iaService.estadoIA());
}

export async function generarPreguntas(req, res) {
  try {
    const {
      tema,
      cantidad = 5,
      tipo = 'multiple_choice',
      dificultad = 'media',
      contexto = null,
    } = req.body || {};

    const preguntas = await iaService.generarPreguntas({ tema, cantidad, tipo, dificultad, contexto });
    return ok(res, { preguntas, cantidad: preguntas.length });
  } catch (err) {
    return error(res, 422, err.message);
  }
}

export async function generarInstrucciones(req, res) {
  try {
    const {
      tema,
      nivel = 'secundario',
      cantidadPreguntas = 5,
      duracionMinutos = 60,
      contexto = null,
    } = req.body || {};

    const instrucciones = await iaService.generarInstrucciones({ tema, nivel, cantidadPreguntas, duracionMinutos, contexto });
    return ok(res, { instrucciones });
  } catch (err) {
    return error(res, 422, err.message);
  }
}
