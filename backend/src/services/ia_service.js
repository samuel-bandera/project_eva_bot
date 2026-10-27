






function getProviderConfig() {
  const preferido = (process.env.IA_PROVIDER || '').toLowerCase();

  const providers = {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      name: 'groq',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      name: 'gemini',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      name: 'deepseek',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      name: 'openai',
    },
  };

  const orden = preferido
    ? [preferido, 'groq', 'gemini', 'deepseek', 'openai']
    : ['groq', 'gemini', 'deepseek', 'openai'];

  for (const key of orden) {
    if (providers[key] && providers[key].apiKey) {
      return providers[key];
    }
  }
  return null;
}

export function estadoIA() {
  const cfg = getProviderConfig();
  return {
    configurada: !!cfg,
    proveedor: cfg?.name || null,
    modelo: cfg?.model || null,
  };
}

function extraerJSON(texto) {
  if (!texto) return null;
  const limpio = String(texto).trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try { return JSON.parse(limpio); } catch {
    const ini = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (ini >= 0 && fin > ini) {
      try { return JSON.parse(limpio.slice(ini, fin + 1)); } catch { return null; }
    }
    return null;
  }
}

async function llamarIA(prompt) {
  const cfg = getProviderConfig();
  if (!cfg) {
    throw new Error('IA no configurada. Agregá GROQ_API_KEY o GEMINI_API_KEY en backend/.env');
  }

  const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: 'Sos un asistente experto en educación. Respondés SOLO con JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${cfg.name} ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generarPreguntas({ tema, cantidad = 5, tipo = 'multiple_choice', dificultad = 'media', contexto = null }) {
  if (!tema || tema.trim().length < 3) throw new Error('El tema es obligatorio');
  const prompt = `Generá ${cantidad} preguntas de tipo "${tipo}" sobre "${tema}", dificultad "${dificultad}".
${contexto ? `Contexto: ${contexto}` : ''}
Devolvé SOLO un JSON: {"preguntas":[{"pregunta":"...","respuesta_correcta":"...","opciones":["A","B","C","D"],"tipo":"${tipo}","puntaje":1.0}]}
Reglas: multiple_choice=4 opciones exactas, respuesta_correcta debe coincidir con una opción.`;
  const raw = await llamarIA(prompt);
  const parsed = extraerJSON(raw);
  if (!parsed?.preguntas) throw new Error('Formato inválido');
  return parsed.preguntas.slice(0, cantidad);
}

export async function corregirRespuestaAbierta({ pregunta, respuestaCorrecta, respuestaAlumno, puntajeMaximo = 1 }) {
  const respuesta = (respuestaAlumno || '').trim();
  if (!respuesta) {
    return { correcta: false, puntaje: 0, feedbackAlumno: 'Sin respuesta.', feedbackDocente: 'Omitida.', omitida: true };
  }

  if (!getProviderConfig()) {
    const acierto = respuesta.toLowerCase() === String(respuestaCorrecta || '').toLowerCase();
    return {
      correcta: acierto, puntaje: acierto ? puntajeMaximo : 0, puntajeMaximo,
      feedbackAlumno: acierto ? 'Correcto.' : 'No coincide.',
      feedbackDocente: 'Corrección exacta (sin IA).', fallback: true,
    };
  }

  const prompt = `Corregí esta respuesta abierta.
PREGUNTA: ${pregunta}
ESPERADO: ${respuestaCorrecta}
ALUMNO: ${respuesta}
PUNTAJE MÁX: ${puntajeMaximo}
Devolvé SOLO JSON: {"correcta":bool,"puntaje":num,"feedback_alumno":"...","feedback_docente":"...","conceptos_clave":["..."]}`;

  try {
    const raw = await llamarIA(prompt);
    const p = extraerJSON(raw);
    return {
      correcta: p?.correcta || false,
      puntaje: Math.min(Number(p?.puntaje) || 0, puntajeMaximo),
      puntajeMaximo,
      feedbackAlumno: p?.feedback_alumno || '',
      feedbackDocente: p?.feedback_docente || '',
      conceptosClave: p?.conceptos_clave || [],
      proveedor: 'ia',
    };
  } catch (e) {
    const acierto = respuesta.toLowerCase() === String(respuestaCorrecta || '').toLowerCase();
    return {
      correcta: acierto, puntaje: acierto ? puntajeMaximo : 0, puntajeMaximo,
      feedbackAlumno: acierto ? 'Correcto (fallback).' : 'No coincide (fallback).',
      feedbackDocente: `IA falló: ${e.message}`, fallback: true,
    };
  }
}
