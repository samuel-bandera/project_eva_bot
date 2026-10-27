import http from './http.js';

export async function listarGrupos() {
  const { data } = await http.get('/grupo');
  return data.data;
}

export async function misGrupos() {
  const { data } = await http.get('/grupo/mios');
  return data.data;
}

export async function obtenerGrupo(id) {
  const { data } = await http.get(`/grupo/${id}`);
  return data.data;
}

export async function crearGrupo(payload) {
  const { data } = await http.post('/grupo', payload);
  return data.data;
}

export async function actualizarGrupo(id, payload) {
  const { data } = await http.patch(`/grupo/${id}`, payload);
  return data.data;
}

export async function agregarAlumno(id, alumnoId) {
  const { data } = await http.post(`/grupo/${id}/alumnos`, { alumnoId });
  return data;
}

export async function quitarAlumno(id, alumnoId) {
  const { data } = await http.delete(`/grupo/${id}/alumnos/${alumnoId}`);
  return data;
}

export async function listarGruposPorMateria(materiaId) {
  const { data } = await http.get(`/grupos/por-materia/${materiaId}`);
  return data.data || [];
}

export async function sugerirCodigoGrupo(carreraId, turno = null, paralelo = null) {
  const params = new URLSearchParams();
  if (turno) params.append('turno', turno);
  if (paralelo) params.append('paralelo', paralelo);
  const qs = params.toString();
  const { data } = await http.get(`/grupos/sugerir-codigo/${carreraId}${qs ? '?' + qs : ''}`);
  return data.data;
}
