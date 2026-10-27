import http from './http.js';

export async function misRegistros({ materiaId = null } = {}) {
  const url = materiaId
    ? `/asistencia/mis-registros?materiaId=${materiaId}`
    : '/asistencia/mis-registros';
  const { data } = await http.get(url);
  return data.data;
}

export async function miResumen() {
  const { data } = await http.get('/asistencia/mi-resumen');
  return data.data;
}

export async function misFaltas() {
  const { data } = await http.get('/asistencia/mis-faltas');
  return data.data;
}

export async function registrarAsistencia(payload) {
  const { data } = await http.post('/asistencia/registrar', payload);
  return data;
}

export async function registrarMasiva(payload) {
  const { data } = await http.post('/asistencia/registrar-masiva', payload);
  return data;
}

export async function registrarFalta(payload) {
  const { data } = await http.post('/asistencia/faltas', payload);
  return data;
}

export async function justificarFalta(faltaId, observacion = null) {
  const { data } = await http.put(`/asistencia/faltas/${faltaId}/justificar`, { observacion });
  return data;
}

export async function sesionesDeMateria(materiaId, grupoId = null) {
  const url = grupoId
    ? `/asistencia/sesiones/materia/${materiaId}?grupoId=${grupoId}`
    : `/asistencia/sesiones/materia/${materiaId}`;
  const { data } = await http.get(url);
  return data.data;
}

export async function crearSesion(payload) {
  const { data } = await http.post('/asistencia/sesiones', payload);
  return data.data;
}

export async function gruposDeMateria(materiaId) {
  const { data } = await http.get(`/asistencia/grupos/${materiaId}`);
  return data.data;
}

export async function alumnosDeGrupo(grupoId) {
  const { data } = await http.get(`/asistencia/grupos/${grupoId}/alumnos`);
  return data.data;
}

export async function subirDocumentoJustificacion(faltaId, formData) {
  const { data } = await http.post(`/asistencia/faltas/${faltaId}/documento`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function faltasDeMateria(materiaId, grupoId = null) {
  const url = grupoId
    ? `/asistencia/faltas/materia/${materiaId}?grupoId=${grupoId}`
    : `/asistencia/faltas/materia/${materiaId}`;
  const { data } = await http.get(url);
  return data.data;
}
