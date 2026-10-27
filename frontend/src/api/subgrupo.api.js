import http from './http.js';

export async function listarSubgrupos() {
  const { data } = await http.get('/subgrupo');
  return data.data;
}

export async function obtenerSubgrupo(id) {
  const { data } = await http.get(`/subgrupo/${id}`);
  return data.data;
}

export async function crearSubgrupo(payload) {
  const { data } = await http.post('/subgrupo', payload);
  return data.data;
}

export async function actualizarSubgrupo(id, payload) {
  const { data } = await http.patch(`/subgrupo/${id}`, payload);
  return data.data;
}

export async function agregarIntegrante(id, alumnoId) {
  const { data } = await http.post(`/subgrupo/${id}/integrantes`, { alumnoId });
  return data;
}

export async function quitarIntegrante(id, alumnoId) {
  const { data } = await http.delete(`/subgrupo/${id}/integrantes/${alumnoId}`);
  return data;
}

export async function crearEntrega(id, payload) {
  const { data } = await http.post(`/subgrupo/${id}/entregas`, payload);
  return data.data;
}

export async function calificarEntrega(entregaId, nota) {
  const { data } = await http.put(`/subgrupo/entregas/${entregaId}/calificar`, { nota });
  return data;
}
