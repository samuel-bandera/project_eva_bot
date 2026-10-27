import http from './http.js';

export async function listarMisEvaluacionesProfesor() {
  const { data } = await http.get('/evaluaciones/profesor/mias');
  return data.data;
}

export async function obtenerEvaluacion(id) {
  const { data } = await http.get(`/evaluaciones/${id}`);
  return data.data;
}

export async function abrirEvaluacion(id) {
  const { data } = await http.post(`/evaluaciones/${id}/abrir`);
  return data;
}

export async function cerrarEvaluacion(id) {
  const { data } = await http.post(`/evaluaciones/${id}/cerrar`);
  return data;
}

export async function despublicarEvaluacion(id) {
  const { data } = await http.post(`/evaluaciones/${id}/despublicar`);
  return data;
}

export async function eliminarEvaluacion(id) {
  const { data } = await http.delete(`/evaluaciones/${id}`);
  return data;
}

export async function obtenerEstadisticas(id) {
  const { data } = await http.get(`/evaluaciones/${id}/estadisticas`);
  return data.data;
}

export async function obtenerResultados(id) {
  const { data } = await http.get(`/evaluaciones/${id}/resultados`);
  return data.data;
}

export async function publicarEvaluacion(id) {
  const { data } = await http.post(`/evaluaciones/${id}/publicar`);
  return data;
}

export async function actualizarEvaluacion(id, datos) {
  const { data } = await http.patch(`/evaluaciones/${id}`, datos);
  return data;
}

export async function agregarPregunta(evaluacionId, payload) {
  const { data } = await http.post(`/evaluaciones/${evaluacionId}/preguntas`, payload);
  return data.data;
}
