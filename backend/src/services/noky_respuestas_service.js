import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

function respuestaRapida(intencion, filtros, datos, ctx) {
  const nombre = ctx.nombre;


  if (intencion === 'saludo') {
    if (ctx.momento === 'mañana') return `¡Buen día, ${nombre}! ☀️ ¿Arrancamos?`;
    if (ctx.momento === 'tarde') return `¡Buenas tardes, ${nombre}! 🌤️ ¿Qué hacemos?`;
    if (ctx.momento === 'noche') return `¡Buenas noches, ${nombre}! 🌙 ¿Último repaso?`;
    return `¡Hola, ${nombre}! ¿Todo bien? 👋`;
  }


  if (intencion === 'gracias') return `¡De nada, ${nombre}! Para eso estoy ✨`;


  if (intencion === 'sobre_noky') {
    return `Soy Noky, tu compañero de estudio en EvalBot. Te ayudo con tus materias, tareas y notas. ¿Qué necesitás?`;
  }


  if (intencion === 'animo_mal') {
    const opciones = [
      `Te escucho, ${nombre}. ¿Querés contarme qué pasó? 💙`,
      `Tranqui, ${nombre}. Un paso a la vez. ¿Seguimos? 🌱`,
      `No estás solo/a en esto, ${nombre}. ¿Arrancamos por algo chico? 💪`,
    ];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }


  if (intencion === 'animo_bien') {
    return `¡Qué bueno, ${nombre}! 🎉 Seguimos así.`;
  }


  if (intencion === 'tareas' && datos.length > 0 && datos.length < 15) {

    const tieneFiltro = filtros.materia || filtros.fecha || filtros.estado;
    if (tieneFiltro) {
      let intro = 'Esto encontré';
      if (filtros.materia) intro += ` de ${filtros.materia}`;
      if (filtros.fecha === 'hoy') intro += ' para HOY';
      else if (filtros.fecha === 'manana') intro += ' para MAÑANA';
      else if (filtros.estado === 'pendientes') intro += ' pendiente';
      else if (filtros.estado === 'vencidas') intro += ' vencido';
      return `${intro}:\n\n${datos.join('\n')}`;
    }
  }


  return null;
}

function construirSystemPrompt(ctx) {
  return `Sos Noky, el compañero de estudio de EvalBot.
Ayudás al alumno a organizarse, entender sus materias, tareas y notas.

## Personalidad
- Cercano y directo: hablás como un compañero, no como un bot corporativo.
- Motivador pero honesto: festejás logros reales, no inventás progreso.
- Claro: respuestas cortas, sin relleno.
- Usás "vos/tenés/podés" (rioplatense).
- Emojis con moderación: 1-2 por respuesta, no satures.

## Reglas estrictas
1. SOLO usás los datos del alumno autenticado que vienen en el contexto. Nunca inventás.
2. Si no tenés la info, decilo en 1-2 líneas claras y concretas. NO rellenes con consejos genéricos ni listas de tips que no pidieron.
3. NUNCA ofrezcas "Pomodoro", "mapas mentales", "subrayar", "tomar apuntes" ni técnicas de estudio genéricas, A MENOS que el alumno pregunte explícitamente cómo estudiar.
4. Si el alumno pregunta "qué estudiar" / "qué debo estudiar" y no tenés materiales, decí: "no tengo materiales subidos a tus materias; fijate en la sección de la materia o preguntale al profe" — breve, sin lista.
5. Podés usar markdown: **negritas**, listas con -, \`código inline\`, bloques \`\`\`.
6. Si la pregunta es fuera de lo académico, redirigí amablemente en 1 línea.
7. NUNCA compartís datos de otros usuarios ni del sistema.
8. NUNCA prometés notas o resultados.
9. Sé directo y breve. Si podés responder en 1-2 líneas, hacelo.

## Contexto actual
- Fecha: ${ctx.fecha}
- Hora: ${ctx.hora}:${String(ctx.minuto).padStart(2, '0')} (${ctx.momento})
- Alumno: ${ctx.nombre}
${ctx.esFinDeSemana ? '- Es fin de semana' : ''}
`;
}

async function generarConIA(mensaje, datos, systemPrompt) {
  const promptCompleto = datos.length > 0
    ? `Datos del alumno:\n${datos.join('\n')}\n\nPregunta del alumno: ${mensaje}`
    : `Pregunta del alumno: ${mensaje}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const result = await generateText({
      model: groq('openai/gpt-oss-120b'),
      system: systemPrompt,
      prompt: promptCompleto,
      abortSignal: controller.signal,
    });
    clearTimeout(timeout);
    return result.text;
  } catch (e) {
    console.warn('[Noky] Groq falló:', e.message);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const result = await generateText({
      model: google('gemini-flash-latest', { apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
      system: systemPrompt,
      prompt: promptCompleto,
      abortSignal: controller.signal,
    });
    clearTimeout(timeout);
    return result.text;
  } catch (e) {
    console.warn('[Noky] Gemini falló:', e.message);
  }

  return null;
}

function respuestaFallback(intencion, datos, ctx) {
  const nombre = ctx.nombre;
  if (intencion === 'saludo') return `¡Hola, ${nombre}! ¿En qué te ayudo?`;
  if (intencion === 'gracias') return '¡De nada! ✨';
  if (intencion === 'animo_mal') return 'Te escucho. ¿Querés contarme qué pasó? 💙';
  if (intencion === 'animo_bien') return '¡Me alegro! 🎉';
  if (intencion === 'sobre_noky') return 'Soy Noky, tu compañero de estudio. Te ayudo con materias, tareas y notas.';
  if (datos.length === 0) return 'No encontré info sobre eso. Probá preguntarme por tus materias, tareas o notas.';

  const titulos = { materias: '📚 Tus materias:', tareas: '📝 Tus tareas:', notas: '📊 Tus notas:' };
  return `${titulos[intencion] || 'Esto encontré:'}\n\n${datos.join('\n')}`;
}

export { respuestaRapida, construirSystemPrompt, generarConIA, respuestaFallback };
