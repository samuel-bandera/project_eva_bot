import http from './http.js';

export async function estado() {
  const { data } = await http.get('/ia/estado');
  return data.data;
}

export async function generarPreguntas(payload) {
  const { data } = await http.post('/ia/generar-preguntas', payload);
  return data.data;
}

export async function generarInstrucciones(payload) {
  const { data } = await http.post('/ia/generar-instrucciones', payload);
  return data.data;
}
