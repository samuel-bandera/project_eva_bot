import http from './http.js';

export async function misDelegados() {
  const { data } = await http.get('/delegado/mios');
  return data.data;
}

export async function delegadosDeGrupo(grupoId) {
  const { data } = await http.get(`/delegado/grupo/${grupoId}`);
  return data.data;
}

export async function crearDelegado(payload) {
  const { data } = await http.post('/delegado/delegados', payload);
  return data.data;
}

export async function listarElecciones() {
  const { data } = await http.get('/delegado/elecciones');
  return data.data;
}

export async function obtenerEleccion(id) {
  const { data } = await http.get(`/delegado/elecciones/${id}`);
  return data.data;
}

export async function resultadosEleccion(id) {
  const { data } = await http.get(`/delegado/elecciones/${id}/resultados`);
  return data.data;
}

export async function crearEleccion(payload) {
  const { data } = await http.post('/delegado/elecciones', payload);
  return data.data;
}

export async function cambiarEstadoEleccion(id, estado) {
  const { data } = await http.put(`/delegado/elecciones/${id}/estado`, { estado });
  return data;
}

export async function postularse(id, payload = {}) {
  const { data } = await http.post(`/delegado/elecciones/${id}/postular`, payload);
  return data;
}

export async function votar(id, payload) {
  const { data } = await http.post(`/delegado/elecciones/${id}/votar`, payload);
  return data;
}
