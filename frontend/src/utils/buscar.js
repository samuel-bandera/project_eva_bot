export function normalizar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function contieneTexto(campo, consulta) {
  if (!consulta || !consulta.trim()) return true;
  return normalizar(campo).includes(normalizar(consulta));
}

export function filtrarPorCampos(items, consulta, campos) {
  if (!consulta || !consulta.trim()) return items;
  return items.filter(item =>
    campos.some(campo => contieneTexto(item[campo], consulta))
  );
}

export function crearDebounce(fn, ms = 300) {
  let temporizador = null;
  return (...args) => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}
