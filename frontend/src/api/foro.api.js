import http from './http.js';

export async function listarHilos(materiaId, { soloRaiz = true } = {}) {
  const { data } = await http.get(`/foro?materiaId=${materiaId}&soloRaiz=${soloRaiz}`);
  return data.data;
}

export async function verHilo(id) {
  const { data } = await http.get(`/foro/${id}`);
  return data.data;
}

export async function crearHilo(payload) {
  const { data } = await http.post('/foro', payload);
  return data.data;
}

export async function editarHilo(id, payload) {
  const { data } = await http.patch(`/foro/${id}`, payload);
  return data;
}

export async function eliminarHilo(id) {
  const { data } = await http.delete(`/foro/${id}`);
  return data;
}

export async function fijarHilo(id, fijado = true) {
  const { data } = await http.put(`/foro/${id}/fijar`, { fijado });
  return data;
}

export async function cerrarHilo(id, cerrado = true) {
  const { data } = await http.put(`/foro/${id}/cerrar`, { cerrado });
  return data;
}

export async function reportarHilo(id, motivo, detalle = null) {
  const { data } = await http.post(`/foro/${id}/reportar`, { motivo, detalle });
  return data;
}

export async function listarReportes() {
  const { data } = await http.get('/foro/reportes');
  return data.data;
}

export async function resolverReporte(id, estado) {
  const { data } = await http.put(`/foro/reportes/${id}/resolver`, { estado });
  return data;
}
