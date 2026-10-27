import http from './http.js';

export async function getNoLeidas() {
  const { data } = await http.get('/notificaciones/no-leidas/count');
  return data.data?.total ?? data.total ?? data.data ?? 0;
}

export async function listarNotificaciones({ limit = 20 } = {}) {
  const { data } = await http.get(`/notificaciones?limit=${limit}`);
  return data.data || [];
}

export async function marcarComoLeida(id) {
  const { data } = await http.put(`/notificaciones/${id}/leer`);
  return data;
}

export async function marcarTodasComoLeidas() {
  const { data } = await http.put('/notificaciones/leer-todas');
  return data;
}
