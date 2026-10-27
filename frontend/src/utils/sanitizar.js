export function escaparHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizarUsuario(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069\x00-\x1F]/g, '')
    .trim()
    .toLowerCase();
}

export function limpiarTexto(str, { maxLen = 500 } = {}) {
  if (typeof str !== 'string') return '';
  return str
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function contienePatronSospechoso(str) {
  if (typeof str !== 'string') return false;
  const patrones = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /\bUNION\s+SELECT\b/i,
    /\bDROP\s+TABLE\b/i,
    /\bINSERT\s+INTO\b/i,
    /--\s*$/,
    /\/\*.*\*\//,
    /\.\.\//,
    /%2e%2e/i,
  ];
  return patrones.some((p) => p.test(str));
}

