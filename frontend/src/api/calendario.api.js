import http from './http.js';

export async function listarEventos({ desde = null, hasta = null, tipo = null } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (tipo) params.set('tipo', tipo);
  const { data } = await http.get(`/calendario?${params.toString()}`);
  return data.data;
}

export async function listarCompleto({ desde = null, hasta = null } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const { data } = await http.get(`/calendario/completo?${params.toString()}`);
  return data.data;
}

export async function proximosEventos() {
  const { data } = await http.get('/calendario/proximos');
  return data.data;
}

export async function obtenerEvento(id) {
  const { data } = await http.get(`/calendario/${id}`);
  return data.data;
}

export async function crearEvento(payload) {
  const { data } = await http.post('/calendario', payload);
  return data.data;
}

export async function actualizarEvento(id, payload) {
  const { data } = await http.patch(`/calendario/${id}`, payload);
  return data.data;
}

export async function eliminarEvento(id) {
  const { data } = await http.delete(`/calendario/${id}`);
  return data;
}
