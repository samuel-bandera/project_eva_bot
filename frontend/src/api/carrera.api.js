import http from './http.js';

export async function listarCarreras() {
  const { data } = await http.get('/carreras');
  return data.data || data;
}

export async function obtenerCarrera(id) {
  const { data } = await http.get(`/carreras/${id}`);
  return data.data || data;
}
