import {
  listarEvaluaciones,
  crearEvaluacion,
  obtenerEvaluacion,
  crearRendicion,
  guardarRespuesta,
  listarRendiciones,
} from '../models/db.model.js';

// GET /api/v1/evaluaciones
export async function listar(req, res) {
  try {
    const { tipo, id } = req.user;
    const data = tipo === 'profesor'
      ? await listarEvaluaciones({ profesorId: id })
      : await listarEvaluaciones({ alumnoId: id });

    res.json({ evaluaciones: data });
  } catch (err) {
    console.error('Error en listar:', err);
    res.status(500).json({ error: 'Error al listar evaluaciones' });
  }
}

// POST /api/v1/evaluaciones  (solo profesor)
export async function crear(req, res) {
  try {
    const { titulo, descripcion, fecha, preguntas } = req.body;

    if (!titulo || !fecha || !Array.isArray(preguntas) || preguntas.length === 0) {
      return res.status(400).json({
        error: 'Faltan datos: título, fecha y al menos 1 pregunta',
      });
    }

    for (const p of preguntas) {
      if (!p.pregunta || !p.respuesta_correcta) {
        return res.status(400).json({
          error: 'Cada pregunta necesita enunciado y respuesta correcta',
        });
      }
    }

    const id = await crearEvaluacion({
      titulo,
      descripcion,
      profesorId: req.user.id,
      fecha,
      preguntas,
    });

    res.status(201).json({ message: 'Evaluación creada', id });
  } catch (err) {
    console.error('Error en crear:', err);
    res.status(500).json({ error: 'Error al crear evaluación' });
  }
}

// GET /api/v1/evaluaciones/:id
export async function detalle(req, res) {
  try {
    const ev = await obtenerEvaluacion(req.params.id);
    if (!ev) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Si es alumno, ocultar respuestas correctas
    if (req.user.tipo === 'alumno') {
      ev.preguntas = ev.preguntas.map(p => ({
        id: p.id,
        pregunta: p.pregunta,
      }));
    }

    res.json({ evaluacion: ev });
  } catch (err) {
    console.error('Error en detalle:', err);
    res.status(500).json({ error: 'Error al obtener evaluación' });
  }
}

// POST /api/v1/evaluaciones/:id/responder  (solo alumno)
export async function responder(req, res) {
  try {
    const evaluacionId = req.params.id;
    const { respuestas } = req.body;

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ error: 'Debés enviar al menos una respuesta' });
    }

    const rendicionId = await crearRendicion({
      evaluacionId,
      alumnoId: req.user.id,
    });

    for (const r of respuestas) {
      await guardarRespuesta({
        rendicionId,
        preguntaId: r.pregunta_id,
        respuesta: r.respuesta || '',
      });
    }

    res.status(201).json({
      message: 'Evaluación respondida',
      rendicionId,
      nota: null, // se calculará cuando la IA corrija
    });
  } catch (err) {
    console.error('Error en responder:', err);
    res.status(500).json({ error: 'Error al responder evaluación' });
  }
}

// GET /api/v1/evaluaciones/:id/rendiciones  (solo profesor)
export async function rendiciones(req, res) {
  try {
    const data = await listarRendiciones(req.params.id);
    res.json({ rendiciones: data });
  } catch (err) {
    console.error('Error en rendiciones:', err);
    res.status(500).json({ error: 'Error al listar rendiciones' });
  }
}