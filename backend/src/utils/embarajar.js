

function prng(seed) {
  let t = (seed >>> 0) || 1;
  return function () {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function embarajar(lista, seed) {
  if (!Array.isArray(lista) || lista.length < 2) return [...lista];
  const rand = prng(Number(seed) || 1);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function embarajarOpciones(opciones, seed) {
  if (!Array.isArray(opciones) || opciones.length < 2) return opciones;
  return embarajar(opciones, seed);
}


export function modeloAlAzar(cantidadModelos) {
  const total = Math.max(1, Number(cantidadModelos) || 1);
  return Math.floor(Math.random() * total) + 1;
}



export function factorial(n) {
  const num = Math.max(0, Math.min(20, Number(n) || 0));
  if (num <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= num; i++) result *= i;
  return result;
}


export function maxModelosPosibles(cantidadPreguntas) {
  const f = factorial(cantidadPreguntas);
  return Math.min(f, 100);
}
