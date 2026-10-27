import http from './http.js';

export async function crearTicket(payload) {
  const { data } = await http.post('/tickets', payload);
  return data.data;
}

export async function getMisTickets() {
  const { data } = await http.get('/tickets/mios');
  return data.data;
}

export async function getTicketsParaMi() {
  const { data } = await http.get('/tickets/para-mi');
  return data.data;
}

export async function getTodosLosTickets(estado = null) {
  const params = estado ? `?estado=${estado}` : '';
  const { data } = await http.get(`/tickets/todos${params}`);
  return data.data;
}

export async function getTicket(id) {
  const { data } = await http.get(`/tickets/${id}`);
  return data.data;
}

export async function responderTicket(id, mensaje) {
  const { data } = await http.post(`/tickets/${id}/responder`, { mensaje });
  return data.data;
}

export async function cambiarEstadoTicket(id, estado) {
  const { data } = await http.patch(`/tickets/${id}/estado`, { estado });
  return data.data;
}

export async function getProfesoresDisponibles() {
  const { data } = await http.get('/tickets/profesores');
  return data.data;
}

export async function getEstadisticasTickets() {
  const { data } = await http.get('/tickets/stats');
  return data.data;
}
