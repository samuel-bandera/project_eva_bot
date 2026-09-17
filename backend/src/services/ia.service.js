// Servicio de IA — placeholder para integrar más adelante
// Ejemplo: OpenAI, Gemini, Claude, etc.

export async function corregirRespuesta({ pregunta, respuestaCorrecta, respuestaAlumno }) {
  // TODO: integrar con API real
  // Por ahora devuelve un stub para no romper el flujo

  const coinciden = respuestaAlumno
    ?.toLowerCase()
    .trim() === respuestaCorrecta?.toLowerCase().trim();

  return {
    nota: coinciden ? 10 : 0,
    correccion: coinciden
      ? 'Respuesta correcta.'
      : 'La respuesta no coincide con la esperada.',
  };
}