import http from './http.js';

export async function listarAvisos() {
  const { data } = await http.get('/cartelera');
  return data.data;
}

export async function obtenerAviso(id) {
  const { data } = await http.get(`/cartelera/${id}`);
  return data.data;
}

export async function crearAviso(payload) {
  const { data } = await http.post('/cartelera', payload);
  return data.data;
}

export async function actualizarAviso(id, payload) {
  const { data } = await http.patch(`/cartelera/${id}`, payload);
  return data.data;
}

export async function eliminarAviso(id) {
  const { data } = await http.delete(`/cartelera/${id}`);
  return data;
}

export async function toggleLike(id) {
  const { data } = await http.post(`/cartelera/${id}/like`);
  return data.data;
}

export async function addComentario(id, contenido) {
  const { data } = await http.post(`/cartelera/${id}/comentar`, { contenido });
  return data;
}

export async function getComentarios(id) {
  const { data } = await http.get(`/cartelera/${id}/comentarios`);
  return data.data;
}
