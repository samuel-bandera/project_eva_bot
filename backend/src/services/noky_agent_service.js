import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { detectarIntencion, extraerFiltros } from './noky_intenciones_service.js';
import { obtenerDatos } from './noky_datos_service.js';
import { respuestaRapida, construirSystemPrompt, generarConIA, respuestaFallback } from './noky_respuestas_service.js';


function normalizarAlumno(arg) {
  if (typeof arg === 'number') return { id: arg, nombre: null, apellido: null, tipo: 'alumno' };
  if (arg && typeof arg === 'object' && arg.id) {
    return {
      id: arg.id,
      nombre: arg.nombre || arg.nombres || arg.firstName || null,
      apellido: arg.apellido || arg.apellidos || arg.lastName || null,
      tipo: arg.tipo || 'alumno',
    };
  }
  return { id: null, nombre: null, apellido: null, tipo: null };
}


function contextoBase(alumno) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const hora = ahora.getHours();
  const minuto = ahora.getMinutes();
  const momento = hora < 6 ? 'madrugada' : hora < 12 ? 'mañana' : hora < 19 ? 'tarde' : 'noche';
  return {
    fecha, hora, minuto, momento,
    nombre: alumno.nombre || 'estudiante',
    esFinDeSemana: [0, 6].includes(ahora.getDay()),
    diaSemana: ahora.getDay(),
  };
}


export async function chatNoky(mensaje, alumnoArg) {
  const alumno = normalizarAlumno(alumnoArg);
  const intencion = detectarIntencion(mensaje);
  const filtros = extraerFiltros(mensaje);
  const ctx = contextoBase(alumno);
  const datos = await obtenerDatos(intencion, alumno.id, filtros);

  if (process.env.NODE_ENV !== 'production') console.log(`[Noky] int=${intencion} | filtros=${JSON.stringify(filtros)} | datos=${datos.length}`);


  const rapida = respuestaRapida(intencion, filtros, datos, ctx);
  if (rapida) {
    if (process.env.NODE_ENV !== 'production') console.log(`[Noky] → respuesta rápida (sin IA)`);
    return rapida;
  }


  const systemPrompt = construirSystemPrompt(ctx);
  const respuestaIA = await generarConIA(mensaje, datos, systemPrompt);

  return respuestaIA || respuestaFallback(intencion, datos, ctx);
}


export async function streamNoky(mensaje, alumnoArg) {
  const alumno = normalizarAlumno(alumnoArg);
  const intencion = detectarIntencion(mensaje);
  const filtros = extraerFiltros(mensaje);
  const ctx = contextoBase(alumno);
  const datos = await obtenerDatos(intencion, alumno.id, filtros);

  if (process.env.NODE_ENV !== 'production') console.log(`[Noky SSE] int=${intencion} | datos=${datos.length}`);

  const systemPrompt = construirSystemPrompt(ctx);
  const promptCompleto = datos.length > 0
    ? `Datos del alumno:\n${datos.join('\n')}\n\nPregunta del alumno: ${mensaje}`
    : `Pregunta del alumno: ${mensaje}`;

  try {
    return streamText({
      model: groq('openai/gpt-oss-120b'),
      system: systemPrompt,
      prompt: promptCompleto,
    });
  } catch (e) {
    console.warn('[Noky SSE] Groq falló, usando Gemini:', e.message);
    return streamText({
      model: google('gemini-flash-latest', { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
      system: systemPrompt,
      prompt: promptCompleto,
    });
  }
}
