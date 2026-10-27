function detectarIntencion(mensaje) {
  const texto = (mensaje || '').toLowerCase().trim();
  if (!texto) return 'general';
  if (/^(hola|buenas|hey|hi|buen d[ií]a|buenas tardes|buenas noches|qu[eé] tal|qu[eé] haces)/.test(texto)) return 'saludo';
  if (/gracias|thanks|te agradezco/.test(texto)) return 'gracias';
  if (/qui[eé]n sos|qu[eé] sos|qu[eé] hac[eé]s|para qu[eé] sirves|c[oó]mo funciona/.test(texto)) return 'sobre_noky';
  if (/materia|curs[oa]|inscri|inscript|anotad/.test(texto)) return 'materias';
  if (/tarea|deber|entrega|pendiente|vencid|tp\b|trabajo pr[aá]ctico/.test(texto)) return 'tareas';
  if (/nota|calificaci|promedio|rendimiento|aprob|desaprob|bolet[ií]n/.test(texto)) return 'notas';
  if (/examen|parcial|evaluaci[oó]n|final\b|recuperatorio/.test(texto)) return 'examenes';
  if (/asistencia|falta|presente|ausente|justific/.test(texto)) return 'asistencia';
  if (/comunicado|aviso|anuncio|noticia/.test(texto)) return 'comunicados';
  if (/material|apunte|archivo|pdf|gu[ií]a|lectura|mand[oó] el profe|subi[oó] el profe|comparti[oó] el profe|para estudiar|qu[eé] (debo|tengo que|hay que) estudiar|qu[eé] estudi(o|ar)|qu[eé] repas(o|ar)|qu[eé] leer|temario|programa de la materia/.test(texto)) return 'materiales';
  if (/cansad|aburrid|harto|estresad|triste|mal\b|baj[oó]n|ansios|nervios/.test(texto)) return 'animo_mal';
  if (/feliz|content|genial|bien\b|excelente|contento/.test(texto)) return 'animo_bien';
  if (/ayuda|help|socorro|no puedo|no s[eé]|c[oó]mo hago|qu[eé] hago/.test(texto)) return 'ayuda';
  return 'general';
}

function extraerFiltros(mensaje) {
  const t = (mensaje || '').toLowerCase();
  const filtros = { materia: null, fecha: null, estado: null, tipo: null, para: null };


  const matchMateria = t.match(/(?:de|para|en)\s+([a-záéíóúñ\s]{3,25})(?:\?|$|,|\.)/);
  if (matchMateria) {
    const candidato = matchMateria[1].trim();
    if (!/^(hoy|mañana|manana|esta semana|este mes|ayer|el lunes|el martes)/.test(candidato)) {
      filtros.materia = candidato;
    }
  }


  if (/\bhoy\b/.test(t)) filtros.fecha = 'hoy';
  else if (/\bmañana\b|\bmanana\b/.test(t)) filtros.fecha = 'manana';
  else if (/\besta semana\b/.test(t)) filtros.fecha = 'semana';
  else if (/\beste mes\b/.test(t)) filtros.fecha = 'mes';
  else if (/\bayer\b/.test(t)) filtros.fecha = 'ayer';


  if (/\bpendiente|sin entregar|falta entregar|falta hacer/.test(t)) filtros.estado = 'pendientes';
  else if (/\bentregad/.test(t)) filtros.estado = 'entregadas';
  else if (/\bvencid|atrasad/.test(t)) filtros.estado = 'vencidas';
  else if (/\baprobad/.test(t)) filtros.estado = 'aprobadas';
  else if (/\bdesaprobad|reprobad/.test(t)) filtros.estado = 'desaprobadas';


  if (/\bexamen|parcial|final\b/.test(t)) filtros.tipo = 'examen';
  else if (/\btp\b|trabajo práctico|trabajo practico/.test(t)) filtros.tipo = 'tp';
  else if (/\btarea\b/.test(t)) filtros.tipo = 'tarea';

  return filtros;
}

export { detectarIntencion, extraerFiltros };
