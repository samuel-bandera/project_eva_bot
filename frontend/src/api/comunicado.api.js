import http from './http.js';

export async function listarComunicados() {
  const { data } = await http.get('/comunicados');
  return data.data;
}

export async function obtenerComunicado(id) {
  const { data } = await http.get(`/comunicados/${id}`);
  return data.data;
}

export async function crearComunicado(payload) {
  const config = payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {};
  const { data } = await http.post('/comunicados', payload, config);
  return data.data;
}

export async function confirmarComunicado(id) {
  const { data } = await http.post(`/comunicados/${id}/confirmar`);
  return data;
}

export async function eliminarComunicado(id) {
  const { data } = await http.delete(`/comunicados/${id}`);
  return data;
}
